import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def escape_sql_string(value: str) -> str:
    return value.replace("'", "''")

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def get_user_from_session(session_token: str, cur):
    escaped_token = escape_sql_string(session_token)
    cur.execute(
        f"""
        SELECT u.id, u.referred_by FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = '{escaped_token}' AND s.expires_at > NOW()
        """
    )
    return cur.fetchone()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Complete PTC view and earn credits (0.7 per view, 0.1 to referrer)
    Args: event - dict with httpMethod, body, headers
          context - object with attributes: request_id, function_name
    Returns: HTTP response with success status and new balance
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    session_token = headers.get('x-session-token') or headers.get('X-Session-Token')
    
    if not session_token:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        user_data = get_user_from_session(session_token, cur)
        if not user_data:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid session'}),
                'isBase64Encoded': False
            }
        
        user_id = user_data['id']
        referrer_id = user_data['referred_by']
        
        body_data = json.loads(event.get('body', '{}'))
        campaign_id = body_data.get('campaign_id')
        captcha_correct = body_data.get('captcha_correct', False)
        
        if not campaign_id or not captcha_correct:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid request'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            f"SELECT id, cost_per_view, total_views, required_views FROM campaigns WHERE id = {campaign_id} AND is_active = true AND moderation_status = 'approved'"
        )
        campaign = cur.fetchone()
        
        if not campaign:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Campaign not found'}),
                'isBase64Encoded': False
            }
        
        if campaign['total_views'] >= campaign['required_views']:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Campaign views limit reached'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            f"SELECT id FROM ad_views WHERE user_id = {user_id} AND campaign_id = {campaign_id} AND DATE(created_at) = CURRENT_DATE"
        )
        if cur.fetchone():
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Already viewed today'}),
                'isBase64Encoded': False
            }
        
        user_reward = 0.7
        referrer_reward = 0.1
        cost_per_view = float(campaign['cost_per_view'])
        
        cur.execute(
            f"INSERT INTO ad_views (user_id, campaign_id, reward, completed, completed_at) VALUES ({user_id}, {campaign_id}, {user_reward}, true, NOW()) RETURNING id"
        )
        ad_view_id = cur.fetchone()['id']
        
        cur.execute(
            f"UPDATE users SET credits = credits + {user_reward}, total_clicks = total_clicks + 1 WHERE id = {user_id} RETURNING credits"
        )
        new_balance = cur.fetchone()['credits']
        
        if referrer_id:
            cur.execute(
                f"UPDATE users SET credits = credits + {referrer_reward}, total_referral_earnings = total_referral_earnings + {referrer_reward} WHERE id = {referrer_id}"
            )
            
            cur.execute(
                f"INSERT INTO referral_earnings (referrer_id, referred_user_id, ad_view_id, credits) VALUES ({referrer_id}, {user_id}, {ad_view_id}, {referrer_reward})"
            )
        
        cur.execute(
            f"UPDATE campaigns SET total_views = total_views + 1, spent = spent + {cost_per_view} WHERE id = {campaign_id}"
        )
        
        escaped_description = escape_sql_string(f'Viewed campaign #{campaign_id}')
        cur.execute(
            f"INSERT INTO transactions (user_id, type, amount, description) VALUES ({user_id}, 'ad_view', {user_reward}, '{escaped_description}')"
        )
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'reward': user_reward,
                'new_balance': float(new_balance)
            }),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
