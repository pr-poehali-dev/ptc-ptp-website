import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def get_user_from_session(session_token: str, cur):
    cur.execute(
        """
        SELECT u.id FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = %s AND s.expires_at > NOW()
        """,
        (session_token,)
    )
    user = cur.fetchone()
    return user['id'] if user else None

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Complete PTC view and earn reward
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
        user_id = get_user_from_session(session_token, cur)
        if not user_id:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid session'}),
                'isBase64Encoded': False
            }
        
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
            "SELECT id, reward, total_views, required_views FROM campaigns WHERE id = %s AND is_active = true AND moderation_status = 'approved'",
            (campaign_id,)
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
            "SELECT id FROM ad_views WHERE user_id = %s AND campaign_id = %s AND DATE(created_at) = CURRENT_DATE",
            (user_id, campaign_id)
        )
        if cur.fetchone():
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Already viewed today'}),
                'isBase64Encoded': False
            }
        
        reward = float(campaign['reward'])
        
        cur.execute(
            "INSERT INTO ad_views (user_id, campaign_id, reward, completed, completed_at) VALUES (%s, %s, %s, true, NOW())",
            (user_id, campaign_id, reward)
        )
        
        cur.execute(
            "UPDATE users SET balance = balance + %s, total_clicks = total_clicks + 1 WHERE id = %s RETURNING balance",
            (reward, user_id)
        )
        new_balance = cur.fetchone()['balance']
        
        cur.execute(
            "UPDATE campaigns SET total_views = total_views + 1, spent = spent + %s WHERE id = %s",
            (reward, campaign_id)
        )
        
        cur.execute(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, 'ad_view', %s, %s)",
            (user_id, reward, f'Viewed campaign #{campaign_id}')
        )
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'reward': reward,
                'new_balance': float(new_balance)
            }),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
