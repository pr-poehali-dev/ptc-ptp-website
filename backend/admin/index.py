import json
import os
import secrets
import string
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def escape_sql_string(value: str) -> str:
    return value.replace("'", "''")

def generate_voucher_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(20))

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Unified admin/user endpoint - vouchers, withdrawals, settings
    Args: event - dict with httpMethod, body (action, params)
          context - object with attributes: request_id, function_name
    Returns: HTTP response with data or error
    '''
    method: str = event.get('httpMethod', 'POST')
    
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
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            action = params.get('action', '')
            
            if action == 'vouchers':
                cur.execute(
                    """SELECT id, code, credits, is_used, used_by, used_at, created_at
                       FROM vouchers ORDER BY created_at DESC LIMIT 100"""
                )
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'vouchers': [dict(v) for v in cur.fetchall()]}),
                    'isBase64Encoded': False
                }
            
            elif action == 'withdrawals':
                cur.execute(
                    """SELECT wr.id, wr.user_id, u.username, u.email, wr.credits, wr.usd_amount,
                              wr.wallet_address, wm.name as method_name, wr.status, wr.created_at
                       FROM withdrawal_requests wr
                       JOIN users u ON wr.user_id = u.id
                       JOIN withdrawal_methods wm ON wr.method_id = wm.id
                       ORDER BY wr.created_at DESC LIMIT 100"""
                )
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'withdrawals': [dict(w) for w in cur.fetchall()]}),
                    'isBase64Encoded': False
                }
            
            elif action == 'withdrawal_methods':
                cur.execute("SELECT id, name FROM withdrawal_methods WHERE is_active = TRUE ORDER BY id")
                methods = cur.fetchall()
                cur.execute("SELECT value FROM settings WHERE key = 'credits_to_usd_rate'")
                rate_row = cur.fetchone()
                rate = float(rate_row['value']) if rate_row else 100.0
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'methods': [dict(m) for m in methods], 'conversion_rate': rate}),
                    'isBase64Encoded': False
                }
            
            elif action == 'withdrawal_history':
                user_id = params.get('user_id')
                if not user_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'user_id required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    f"""SELECT wr.id, wr.credits, wr.usd_amount, wr.wallet_address, wr.status, 
                               wr.created_at, wm.name as method_name
                        FROM withdrawal_requests wr
                        JOIN withdrawal_methods wm ON wr.method_id = wm.id
                        WHERE wr.user_id = {int(user_id)}
                        ORDER BY wr.created_at DESC LIMIT 50"""
                )
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'history': [dict(h) for h in cur.fetchall()]}),
                    'isBase64Encoded': False
                }
            
            elif action == 'settings':
                cur.execute("SELECT key, value FROM settings")
                settings = cur.fetchall()
                cur.execute("SELECT id, name, is_active FROM withdrawal_methods ORDER BY id")
                methods = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'settings': {s['key']: s['value'] for s in settings},
                        'withdrawal_methods': [dict(m) for m in methods]
                    }),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'activate_voucher':
                voucher_code = body_data.get('voucher_code', '').strip().upper()
                user_id = body_data.get('user_id')
                
                if not voucher_code or not user_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Voucher code and user_id required'}),
                        'isBase64Encoded': False
                    }
                
                voucher_code_escaped = escape_sql_string(voucher_code)
                cur.execute(f"SELECT id, credits, is_used FROM vouchers WHERE code = '{voucher_code_escaped}'")
                voucher = cur.fetchone()
                
                if not voucher:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Voucher not found'}),
                        'isBase64Encoded': False
                    }
                
                if voucher['is_used']:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Voucher already used'}),
                        'isBase64Encoded': False
                    }
                
                credits = float(voucher['credits'])
                cur.execute(f"UPDATE vouchers SET is_used = TRUE, used_by = {user_id}, used_at = NOW() WHERE id = {voucher['id']}")
                cur.execute(f"UPDATE users SET credits = credits + {credits} WHERE id = {user_id} RETURNING credits")
                new_balance = cur.fetchone()
                cur.execute(f"INSERT INTO transactions (user_id, amount, type, description) VALUES ({user_id}, {credits}, 'credit', 'Voucher: {voucher_code_escaped}')")
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'credits_added': credits,
                        'new_balance': float(new_balance['credits'])
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'request_withdrawal':
                user_id = body_data.get('user_id')
                credits = float(body_data.get('credits', 0))
                method_id = body_data.get('method_id')
                wallet_address = body_data.get('wallet_address', '').strip()
                
                if not all([user_id, credits > 0, method_id, wallet_address]):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'All fields required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(f"SELECT credits FROM users WHERE id = {user_id}")
                user = cur.fetchone()
                
                if not user or float(user['credits']) < credits:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Insufficient credits'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("SELECT value FROM settings WHERE key = 'credits_to_usd_rate'")
                rate_row = cur.fetchone()
                rate = float(rate_row['value']) if rate_row else 100.0
                usd_amount = credits / rate
                wallet_escaped = escape_sql_string(wallet_address)
                
                cur.execute(
                    f"""INSERT INTO withdrawal_requests (user_id, credits, usd_amount, method_id, wallet_address, status)
                        VALUES ({user_id}, {credits}, {usd_amount}, {method_id}, '{wallet_escaped}', 'pending') RETURNING id"""
                )
                request_id = cur.fetchone()['id']
                cur.execute(f"UPDATE users SET credits = credits - {credits} WHERE id = {user_id}")
                cur.execute(f"INSERT INTO transactions (user_id, amount, type, description) VALUES ({user_id}, -{credits}, 'withdrawal', 'Withdrawal #{request_id}')")
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'request_id': request_id, 'usd_amount': round(usd_amount, 2)}),
                    'isBase64Encoded': False
                }
            
            elif action == 'generate_vouchers':
                credits = float(body_data.get('credits', 0))
                count = int(body_data.get('count', 1))
                
                if credits <= 0 or count <= 0 or count > 1000:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid params (credits > 0, 1 <= count <= 1000)'}),
                        'isBase64Encoded': False
                    }
                
                vouchers = []
                for _ in range(count):
                    code = generate_voucher_code()
                    cur.execute(f"INSERT INTO vouchers (code, credits) VALUES ('{code}', {credits}) RETURNING id, code")
                    voucher = cur.fetchone()
                    vouchers.append({'id': voucher['id'], 'code': voucher['code'], 'credits': credits})
                
                conn.commit()
                csv_content = "Code,Credits\n" + "\n".join(f"{v['code']},{v['credits']}" for v in vouchers)
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'text/csv',
                        'Access-Control-Allow-Origin': '*',
                        'Content-Disposition': f'attachment; filename="vouchers_{len(vouchers)}.csv"'
                    },
                    'body': csv_content,
                    'isBase64Encoded': False
                }
            
            elif action == 'update_rate':
                rate = float(body_data.get('rate', 100))
                if rate <= 0:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Rate must be > 0'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(f"UPDATE settings SET value = '{rate}', updated_at = NOW() WHERE key = 'credits_to_usd_rate'")
                conn.commit()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'rate': rate}),
                    'isBase64Encoded': False
                }
            
            elif action == 'toggle_withdrawal_method':
                method_id = int(body_data.get('method_id'))
                is_active = body_data.get('is_active', True)
                cur.execute(f"UPDATE withdrawal_methods SET is_active = {is_active} WHERE id = {method_id}")
                conn.commit()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'process_withdrawal':
                request_id = int(body_data.get('request_id'))
                status = body_data.get('status', 'completed')
                
                if status not in ['completed', 'rejected']:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid status'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    f"""UPDATE withdrawal_requests SET status = '{status}', processed_at = NOW() 
                        WHERE id = {request_id} RETURNING user_id, credits, usd_amount"""
                )
                withdrawal = cur.fetchone()
                
                if status == 'completed':
                    cur.execute(f"UPDATE users SET total_payouts = total_payouts + {withdrawal['usd_amount']} WHERE id = {withdrawal['user_id']}")
                elif status == 'rejected':
                    cur.execute(f"UPDATE users SET credits = credits + {withdrawal['credits']} WHERE id = {withdrawal['user_id']}")
                
                conn.commit()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid action'}),
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
