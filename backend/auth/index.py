import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_session_token() -> str:
    return secrets.token_urlsafe(32)

def generate_referral_code() -> str:
    return secrets.token_urlsafe(8)[:10]

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def escape_sql_string(value: str) -> str:
    return value.replace("'", "''") 

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: User authentication with credits system and referral support
    Args: event - dict with httpMethod, body, queryStringParameters
          context - object with attributes: request_id, function_name
    Returns: HTTP response with session token or error
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
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action')
    email = body_data.get('email', '').strip().lower()
    password = body_data.get('password', '')
    username = body_data.get('username', '').strip()
    referral_code = body_data.get('referral_code', '').strip()
    
    if not email or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Email and password are required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if action == 'register':
            if not username:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username is required'}),
                    'isBase64Encoded': False
                }
            
            email_escaped = escape_sql_string(email)
            cur.execute(f"SELECT id FROM users WHERE email = '{email_escaped}'")
            if cur.fetchone():
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Email already registered'}),
                    'isBase64Encoded': False
                }
            
            referrer_id = None
            if referral_code:
                referral_code_escaped = escape_sql_string(referral_code)
                cur.execute(f"SELECT id FROM users WHERE referral_code = '{referral_code_escaped}'")
                referrer = cur.fetchone()
                if referrer:
                    referrer_id = referrer['id']
            
            password_hash = hash_password(password)
            username_escaped = escape_sql_string(username)
            user_referral_code = generate_referral_code()
            
            if referrer_id:
                cur.execute(
                    f"""INSERT INTO users (email, password_hash, username, referral_code, referred_by, credits) 
                        VALUES ('{email_escaped}', '{password_hash}', '{username_escaped}', '{user_referral_code}', {referrer_id}, 0.00) 
                        RETURNING id"""
                )
            else:
                cur.execute(
                    f"""INSERT INTO users (email, password_hash, username, referral_code, credits) 
                        VALUES ('{email_escaped}', '{password_hash}', '{username_escaped}', '{user_referral_code}', 0.00) 
                        RETURNING id"""
                )
            
            user_id = cur.fetchone()['id']
            conn.commit()
            
            session_token = generate_session_token()
            expires_at = (datetime.now() + timedelta(days=30)).isoformat()
            cur.execute(
                f"INSERT INTO sessions (user_id, session_token, expires_at) VALUES ({user_id}, '{session_token}', '{expires_at}')"
            )
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'session_token': session_token,
                    'user': {
                        'id': user_id,
                        'email': email,
                        'username': username,
                        'referral_code': user_referral_code
                    }
                }),
                'isBase64Encoded': False
            }
        
        elif action == 'login':
            password_hash = hash_password(password)
            email_escaped = escape_sql_string(email)
            cur.execute(
                f"""SELECT id, email, username, credits, ad_balance, total_clicks, total_payouts, 
                           referral_code, total_referral_earnings 
                    FROM users 
                    WHERE email = '{email_escaped}' AND password_hash = '{password_hash}'"""
            )
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid credentials'}),
                    'isBase64Encoded': False
                }
            
            session_token = generate_session_token()
            expires_at = (datetime.now() + timedelta(days=30)).isoformat()
            cur.execute(
                f"INSERT INTO sessions (user_id, session_token, expires_at) VALUES ({user['id']}, '{session_token}', '{expires_at}')"
            )
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'session_token': session_token,
                    'user': {
                        'id': user['id'],
                        'email': user['email'],
                        'username': user['username'],
                        'credits': float(user['credits']),
                        'ad_balance': float(user['ad_balance']),
                        'total_clicks': user['total_clicks'],
                        'total_payouts': float(user['total_payouts']),
                        'referral_code': user['referral_code'],
                        'total_referral_earnings': float(user['total_referral_earnings'])
                    }
                }),
                'isBase64Encoded': False
            }
        
        elif action == 'verify':
            session_token = body_data.get('session_token')
            if not session_token:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Session token required'}),
                    'isBase64Encoded': False
                }
            
            session_token_escaped = escape_sql_string(session_token)
            cur.execute(
                f"""
                SELECT u.id, u.email, u.username, u.credits, u.ad_balance, u.total_clicks, u.total_payouts,
                       u.referral_code, u.total_referral_earnings
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.session_token = '{session_token_escaped}' AND s.expires_at > NOW()
                """
            )
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid or expired session'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'user': {
                        'id': user['id'],
                        'email': user['email'],
                        'username': user['username'],
                        'credits': float(user['credits']),
                        'ad_balance': float(user['ad_balance']),
                        'total_clicks': user['total_clicks'],
                        'total_payouts': float(user['total_payouts']),
                        'referral_code': user['referral_code'],
                        'total_referral_earnings': float(user['total_referral_earnings'])
                    }
                }),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid action'}),
                'isBase64Encoded': False
            }
    
    finally:
        cur.close()
        conn.close()
