import os
import random
from decimal import Decimal
from flask import Flask, jsonify, request
from flask_cors import CORS
from web3 import Web3
from eth_account.messages import encode_defunct
import mysql.connector
from mysql.connector import pooling # Import the pooling library
import requests
from dotenv import load_dotenv
import smtplib
from email.message import EmailMessage

load_dotenv()
app = Flask(__name__)
CORS(app)
w3 = Web3()

db_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="web3_wallet_pool",
    pool_size=5,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_DATABASE")
)
print("✅ Database connection pool created successfully.")


def send_email_notification(sender, recipient, amount):
    try:
        SENDER_EMAIL = os.getenv("EMAIL_ADDRESS")
        SENDER_PASSWORD = os.getenv("EMAIL_PASSWORD")
        RECIPIENT_EMAIL = os.getenv("RECIPIENT_EMAIL")

        if not all([SENDER_EMAIL, SENDER_PASSWORD, RECIPIENT_EMAIL]):
            print("⚠️ Email credentials not found in .env file. Skipping notification.")
            return

        msg = EmailMessage()
        msg.set_content(f"Your transfer of {amount:.6f} ETH from {sender} to {recipient} was successful.")
        msg['Subject'] = '✅ [CypherD] Transaction Successful!'
        msg['From'] = SENDER_EMAIL
        msg['To'] = RECIPIENT_EMAIL

        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ Notification email sent to {RECIPIENT_EMAIL}")
    except Exception as e:
        print(f"❌ Failed to send email notification: {e}")

@app.route('/balance/<address>', methods=['GET'])
def get_balance(address):
    cnx = None
    cursor = None
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM wallets WHERE address = %s", (address,))
        wallet = cursor.fetchone()

        if not wallet:
            initial_balance = Decimal(random.uniform(1.0, 10.0))
            cursor.execute("INSERT INTO wallets (address, balance) VALUES (%s, %s)", (address, initial_balance))
            cnx.commit()
            wallet = {'address': address, 'balance': initial_balance}
        
        wallet['balance'] = float(wallet['balance'])
        return jsonify(wallet)
    except Exception as e:
        print(f"Error in get_balance: {e}")
        return jsonify({"error": "Database query failed"}), 500
    finally:
        if cursor:
            cursor.close()
        if cnx:
            cnx.close()

@app.route('/initiate-transfer', methods=['POST'])
def initiate_transfer():
    data = request.get_json()
    sender = data['sender']
    recipient = data['recipient']
    amount = data['amount']
    transfer_type = data['type']

    message = ""
    eth_amount = 0

    if transfer_type == 'ETH':
        eth_amount = Decimal(amount)
        message = f"Send {amount} ETH to {recipient} from {sender}"
    else:
        amount_in_smallest_unit = str(int(Decimal(amount) * 10**6))
        
        payload = {
          "source_asset_denom": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          "source_asset_chain_id": "1",
          "dest_asset_denom": "ethereum-native",
          "dest_asset_chain_id": "1",
          "amount_in": amount_in_smallest_unit,
          "chain_ids_to_addresses": { "1": "0x742d35Cc6634C0532925a3b8D4C9db96c728b0B4" },
          "slippage_tolerance_percent": "1",
          "smart_swap_options": { "evm_swaps": True },
          "allow_unsafe": False
        }
        response = requests.post('https://api.skip.build/v2/fungible/msgs_direct', json=payload)
        response_data = response.json()

        quoted_eth_amount = response_data['route']['amount_out']
        eth_amount = Decimal(quoted_eth_amount) / Decimal(10**18)
        
        message = f"Send {eth_amount:.6f} ETH (${amount} USD) to {recipient} from {sender}"

    return jsonify({'message': message, 'ethAmount': float(eth_amount)})

@app.route('/execute-transfer', methods=['POST'])
def execute_transfer():
    cnx = None
    cursor = None
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor()
        
        data = request.get_json()
        message = data['message']
        signature = data['signature']
        sender = data['sender']
        recipient = data['recipient']
        eth_amount = Decimal(data['ethAmount'])
        
        signable_message = encode_defunct(text=message)
        recovered_address = w3.eth.account.recover_message(signable_message, signature=signature)

        if recovered_address.lower() != sender.lower():
            return jsonify({'error': 'Invalid signature.'}), 401
        
        if 'USD' in message:
            try:
                usd_amount_str = message.split('$')[1].split(' ')[0]
                amount_in_smallest_unit = str(int(Decimal(usd_amount_str) * 10**6))
                
                payload = {
                    "source_asset_denom": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    "source_asset_chain_id": "1",
                    "dest_asset_denom": "ethereum-native",
                    "dest_asset_chain_id": "1",
                    "amount_in": amount_in_smallest_unit,
                    "chain_ids_to_addresses": { "1": "0x742d35Cc6634C0532925a3b8D4C9db96c728b0B4" },
                }
                response = requests.post('https://api.skip.build/v2/fungible/msgs_direct', json=payload)
                response.raise_for_status()
                response_data = response.json()

                if 'route' in response_data and 'amount_out' in response_data['route']:
                    new_quoted_eth = Decimal(response_data['route']['amount_out']) / Decimal(10**18)
                    percentage_diff = (abs(eth_amount - new_quoted_eth) / eth_amount) * 100
                    if percentage_diff > 1:
                        print(f"❌ Slippage too high: {percentage_diff:.2f}%")
                        return jsonify({'error': 'Price changed too much. Please try again.'}), 400
                else:
                    raise ValueError("Invalid API response for slippage check")
            except Exception as e:
                print(f"❌ Error during slippage check: {e}")
                return jsonify({'error': 'Could not verify price. Please try again.'}), 500

        cursor.execute("START TRANSACTION")
        cursor.execute("SELECT balance FROM wallets WHERE address = %s FOR UPDATE", (sender,))
        sender_wallet = cursor.fetchone()

        if not sender_wallet or sender_wallet[0] < eth_amount:
            cnx.rollback()
            return jsonify({'error': 'Insufficient funds.'}), 400

        cursor.execute("SELECT address FROM wallets WHERE address = %s", (recipient,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO wallets (address, balance) VALUES (%s, 0)", (recipient,))

        cursor.execute("UPDATE wallets SET balance = balance - %s WHERE address = %s", (eth_amount, sender))
        cursor.execute("UPDATE wallets SET balance = balance + %s WHERE address = %s", (eth_amount, recipient))
        cursor.execute("INSERT INTO transactions (sender, recipient, amount) VALUES (%s, %s, %s)", (sender, recipient, eth_amount))
        
        cnx.commit()
        
        send_email_notification(sender, recipient, eth_amount)
        return jsonify({'success': True, 'message': 'Transfer successful!'})

    except Exception as e:
        if cnx:
            cnx.rollback()
        print(f"Error in execute_transfer: {e}")
        return jsonify({'error': 'A critical error occurred.'}), 500
    finally:
        if cursor:
            cursor.close()
        if cnx:
            cnx.close()

@app.route('/transactions/<address>', methods=['GET'])
def get_transactions(address):
    cnx = None
    cursor = None
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = "SELECT * FROM transactions WHERE sender = %s OR recipient = %s ORDER BY timestamp DESC"
        cursor.execute(query, (address, address))
        transactions = cursor.fetchall()
        for t in transactions:
            t['amount'] = float(t['amount'])
        return jsonify(transactions)
    except Exception as e:
        print(f"Error in get_transactions: {e}")
        return jsonify({"error": "Database query failed"}), 500
    finally:
        if cursor:
            cursor.close()
        if cnx:
            cnx.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001, debug=True)

#End