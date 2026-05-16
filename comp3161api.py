from flask import Flask, request, make_response
from flask_httpauth import HTTPBasicAuth
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()
auth = HTTPBasicAuth()


app = Flask(__name__)

DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')
DB_HOST = os.getenv('DB_HOST')



@auth.verify_password
def verify_password(username,password):
    if username == os.getenv('AD_USERNAME') and password==os.getenv('ADMIN_PASSWORD'):
        return username
    


@app.route('/register_user', methods=['POST'])
def register_user():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor()
        content = request.json

        role = content['role'].lower()
        email = content['email']
        password_hash = content['password_hash']
        first_name = content['first_name']
        last_name = content['last_name']
        created_by_admin_id = content.get('created_by_admin_id')

        if role == 'admin':
            query = """
                INSERT INTO admin
                (email, password_hash, first_name, last_name, created_by_admin_id)
                VALUES (%s, %s, %s, %s, %s)
            """
            values = (email, password_hash, first_name, last_name, created_by_admin_id)

        elif role == 'lecturer':
            query = """
                INSERT INTO lecturer
                (email, password_hash, first_name, last_name, created_by_admin_id)
                VALUES (%s, %s, %s, %s, %s)
            """
            values = (email, password_hash, first_name, last_name, created_by_admin_id)

        elif role == 'student':
            student_no = content['student_no']
            query = """
                INSERT INTO student
                (student_no, email, password_hash, first_name, last_name, created_by_admin_id)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            values = (student_no, email, password_hash, first_name, last_name, created_by_admin_id)

        else:
            return make_response({"error": "Invalid role. Use admin, lecturer, or student."}, 400)

        cursor.execute(query, values)
        cnx.commit()

        new_id = cursor.lastrowid

        cursor.close()
        cnx.close()

        return make_response({
            "success": "user account created",
            "role": role,
            "user_id": new_id
        }, 201)

    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
    


@app.route('/login', methods=['POST'])
def login():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)

        content = request.json
        role = content['role'].lower()
        email = content['email']
        password_hash = content['password_hash']

        if role == 'student':
            query = "SELECT * FROM student WHERE email = %s AND password_hash = %s"
        elif role == 'lecturer':
            query = "SELECT * FROM lecturer WHERE email = %s AND password_hash = %s"
        else:
            return make_response({"error": "Only students and lecturers can login here"}, 400)

        cursor.execute(query, (email, password_hash))
        user = cursor.fetchone()

        cursor.close()
        cnx.close()

        if user:
            return make_response({
                "success": "login successful",
                "role": role,
                "user": user
            }, 200)
        else:
            return make_response({
                "error": "Invalid email or password"
            }, 401)

    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)