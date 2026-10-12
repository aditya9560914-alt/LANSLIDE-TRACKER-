import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONT=os.path.join(ROOT,"frontend")
app=Flask(__name__,static_folder=FRONT,static_url_path="")
CORS(app)
# DB={"host":os.getenv("DB_HOST","127.0.0.1"),"port":int(os.getenv("DB_PORT","3306")),"user":os.getenv("DB_USER","root"),"password":os.getenv("DB_PASSWORD",""),"database":os.getenv("DB_NAME","landslide_tracker")}

DB = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "landslide_tracker")
}

def conn():
    return mysql.connector.connect(**DB)

def rows(sql, params=()):
    c = conn()
    cur = c.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        data = cur.fetchall()

        for row in data:
            for key, value in row.items():
                if hasattr(value, "total_seconds"):
                    row[key] = str(value)
                elif hasattr(value, "isoformat"):
                    row[key] = value.isoformat()

        return data
    finally:
        cur.close()
        c.close()
@app.get("/")
def home(): return send_from_directory(FRONT,"index.html")
@app.get("/api/health")
def health():
    try: rows("SELECT 1")
    except Exception as e: return jsonify(status="error",database="unavailable",message=str(e)),503
    return jsonify(status="ok",database="connected")
@app.get("/api/incidents")
def get_incidents():
    sql="SELECT * FROM incidents WHERE 1=1"; p=[]
    q=request.args.get("search","").strip()
    if q:
        sql+=" AND (CAST(id AS CHAR) LIKE %s OR location LIKE %s OR district LIKE %s OR state LIKE %s)"
        v=f"%{q}%";p += [v,v,v,v]
    for col,arg in [("state","state"),("district","district"),("risk","risk"),("status","status"),("incident_date","date")]:
        v=request.args.get(arg,"").strip()
        if v: sql+=f" AND {col}=%s";p.append(v)
    sql+=" ORDER BY incident_date DESC,id DESC"
    return jsonify(rows(sql,p))
@app.post("/api/incidents")
def add_incident():
    d=request.get_json() or {}
    required=["state","district","location","incident_date","description"]
    if any(not str(d.get(k,"")).strip() for k in required): return jsonify(error="Required fields missing"),400
    sql="""INSERT INTO incidents(location,state,district,latitude,longitude,incident_date,incident_time,risk,status,rainfall,affected_area,affected_people,road_status,description,source)
           VALUES(%s,%s,%s,NULL,NULL,%s,'00:00:00','Medium','Pending Verification',0,0,0,'Unknown',%s,'User Report')"""
    c=conn();cur=c.cursor()
    try: cur.execute(sql,(d["location"],d["state"],d["district"],d["incident_date"],d["description"]));c.commit();return jsonify(id=cur.lastrowid,message="Report submitted"),201
    finally:cur.close();c.close()
@app.get("/api/incidents/<int:i>")
def one(i):
    d=rows("SELECT * FROM incidents WHERE id=%s",(i,))
    return (jsonify(d[0]),200) if d else (jsonify(error="Not found"),404)
@app.get("/api/states")
def states(): return jsonify([x["state"] for x in rows("SELECT DISTINCT state FROM incidents ORDER BY state")])
@app.get("/api/districts")
def districts():
    s=request.args.get("state","").strip()
    q="SELECT DISTINCT district FROM incidents"+(" WHERE state=%s" if s else "")+" ORDER BY district"
    return jsonify([x["district"] for x in rows(q,(s,) if s else ())])
@app.get("/api/statistics")
def statistics():
    total=rows("SELECT COUNT(*) n FROM incidents")[0]["n"]
    risk=rows("SELECT risk,COUNT(*) n FROM incidents GROUP BY risk")
    status=rows("SELECT status,COUNT(*) n FROM incidents GROUP BY status")
    return jsonify(total_incidents=total,risk={x["risk"]:x["n"] for x in risk},status={x["status"]:x["n"] for x in status},states_covered=rows("SELECT COUNT(DISTINCT state) n FROM incidents")[0]["n"],districts_covered=rows("SELECT COUNT(DISTINCT district) n FROM incidents")[0]["n"])
@app.get("/api/analytics")
def analytics():
    return jsonify(by_state=rows("SELECT state,COUNT(*) count FROM incidents GROUP BY state ORDER BY count DESC"),by_risk={x["risk"]:x["count"] for x in rows("SELECT risk,COUNT(*) count FROM incidents GROUP BY risk")})
@app.errorhandler(404)
def nf(e):
    if request.path.startswith("/api/"): return jsonify(error="API endpoint not found"),404
    return send_from_directory(FRONT,"index.html")
if __name__=="__main__": app.run(host="127.0.0.1",port=5000,debug=True)
