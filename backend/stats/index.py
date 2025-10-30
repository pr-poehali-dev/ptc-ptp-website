import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def escape_sql_string(value: str) -> str:
    """Escape single quotes in SQL strings by doubling them"""
    return value.replace("'", "''")

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get platform statistics (total users, payouts, campaigns)
    Args: event - dict with httpMethod
          context - object with attributes: request_id, function_name
    Returns: HTTP response with stats
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT COUNT(*) as total_users FROM users")
        total_users = cur.fetchone()['total_users']
        
        cur.execute("SELECT COUNT(*) as active_campaigns FROM campaigns WHERE is_active = true")
        active_campaigns = cur.fetchone()['active_campaigns']
        
        cur.execute(
            "SELECT COALESCE(SUM(reward), 0) as total_payouts FROM ad_views WHERE completed = true"
        )
        total_payouts = float(cur.fetchone()['total_payouts'])
        
        cur.execute(
            "SELECT COALESCE(AVG(balance), 0) as avg_earnings FROM users WHERE balance > 0"
        )
        avg_earnings = float(cur.fetchone()['avg_earnings'])
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'total_users': total_users,
                'active_campaigns': active_campaigns,
                'total_payouts': round(total_payouts, 2),
                'avg_earnings': round(avg_earnings, 2)
            }),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
