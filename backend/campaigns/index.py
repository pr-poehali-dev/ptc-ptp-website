import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from decimal import Decimal

def escape_sql_string(value: str) -> str:
    """Escape single quotes in SQL strings by doubling them"""
    return value.replace("'", "''")

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def get_user_from_session(session_token: str, cur):
    escaped_token = escape_sql_string(session_token)
    cur.execute(
        f"""
        SELECT u.id FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = '{escaped_token}' AND s.expires_at > NOW()
        """
    )
    user = cur.fetchone()
    return user['id'] if user else None

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manage PTC campaigns (create, list, view)
    Args: event - dict with httpMethod, body, queryStringParameters
          context - object with attributes: request_id, function_name
    Returns: HTTP response with campaigns data
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if method == 'POST':
            headers = event.get('headers', {})
            session_token = headers.get('x-session-token') or headers.get('X-Session-Token')
            
            if not session_token:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unauthorized'}),
                    'isBase64Encoded': False
                }
            
            user_id = get_user_from_session(session_token, cur)
            if not user_id:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid session'}),
                    'isBase64Encoded': False
                }
            
            body_data = json.loads(event.get('body', '{}'))
            title = body_data.get('title', '').strip()
            url = body_data.get('url', '').strip()
            required_views = body_data.get('required_views', 0)
            
            if not title or not url or required_views <= 0:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid campaign data'}),
                    'isBase64Encoded': False
                }
            
            cost_per_1000 = Decimal('0.15')
            total_cost = (Decimal(required_views) / 1000) * cost_per_1000
            reward_per_view = cost_per_1000 / 1000
            
            cur.execute(f"SELECT ad_balance FROM users WHERE id = {user_id}")
            user = cur.fetchone()
            
            if Decimal(user['ad_balance']) < total_cost:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Insufficient balance'}),
                    'isBase64Encoded': False
                }
            
            escaped_title = escape_sql_string(title)
            escaped_url = escape_sql_string(url)
            cur.execute(
                f"""
                INSERT INTO campaigns 
                (advertiser_id, title, url, reward, duration, budget, required_views, moderation_status, is_active)
                VALUES ({user_id}, '{escaped_title}', '{escaped_url}', {float(reward_per_view)}, 5, {float(total_cost)}, {required_views}, 'pending', false)
                RETURNING id
                """
            )
            campaign_id = cur.fetchone()['id']
            
            cur.execute(
                f"UPDATE users SET ad_balance = ad_balance - {float(total_cost)} WHERE id = {user_id}"
            )
            
            escaped_description = escape_sql_string(f'Created campaign: {title}')
            cur.execute(
                f"INSERT INTO transactions (user_id, type, amount, description) VALUES ({user_id}, 'campaign_create', {float(total_cost)}, '{escaped_description}')"
            )
            
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'campaign_id': campaign_id,
                    'total_cost': float(total_cost),
                    'message': 'Кампания отправлена на модерацию. Таймер: 5 секунд.'
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'GET':
            params = event.get('queryStringParameters') or {}
            action = params.get('action', 'list')
            
            if action == 'available':
                headers = event.get('headers', {})
                session_token = headers.get('x-session-token') or headers.get('X-Session-Token')
                
                if not session_token:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Unauthorized'}),
                        'isBase64Encoded': False
                    }
                
                user_id = get_user_from_session(session_token, cur)
                if not user_id:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid session'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    f"""
                    SELECT c.id, c.title, c.url, c.reward, c.duration
                    FROM campaigns c
                    WHERE c.is_active = true 
                    AND c.moderation_status = 'approved'
                    AND c.total_views < c.required_views
                    AND c.id NOT IN (
                        SELECT campaign_id FROM ad_views 
                        WHERE user_id = {user_id} AND DATE(created_at) = CURRENT_DATE
                    )
                    ORDER BY c.created_at DESC
                    LIMIT 50
                    """
                )
                campaigns = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'campaigns': [
                            {
                                'id': c['id'],
                                'title': c['title'],
                                'url': c['url'],
                                'reward': float(c['reward']),
                                'duration': c['duration']
                            }
                            for c in campaigns
                        ]
                    }),
                    'isBase64Encoded': False
                }
            
            else:
                cur.execute(
                    """
                    SELECT id, title, url, reward, duration, total_views, required_views, 
                           moderation_status, is_active, created_at
                    FROM campaigns
                    WHERE moderation_status = 'approved' AND is_active = true
                    ORDER BY created_at DESC
                    LIMIT 20
                    """
                )
                campaigns = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'campaigns': [
                            {
                                'id': c['id'],
                                'title': c['title'],
                                'url': c['url'],
                                'reward': float(c['reward']),
                                'duration': c['duration'],
                                'total_views': c['total_views'],
                                'required_views': c['required_views'],
                                'status': c['moderation_status']
                            }
                            for c in campaigns
                        ]
                    }),
                    'isBase64Encoded': False
                }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    finally:
        cur.close()
        conn.close()
