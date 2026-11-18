import http.client
import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import Store, create_server, demo_rows


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.path=Path(cls.temp.name)/"test.sqlite3"
        cls.server=create_server(0,cls.path)
        cls.port=cls.server.server_port
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.temp.cleanup()

    def request(self,path,body=None,cookie=None,origin=True):
        connection=http.client.HTTPConnection("127.0.0.1",self.port,timeout=30)
        headers={}
        if cookie: headers["Cookie"]=cookie
        if origin: headers["Origin"]=f"http://127.0.0.1:{self.port}"
        if body is not None: headers["Content-Type"]="application/json"
        connection.request("POST" if body is not None else "GET",path,json.dumps(body) if body is not None else None,headers)
        response=connection.getresponse();raw=response.read()
        content=json.loads(raw) if "application/json" in response.getheader("Content-Type","") else raw
        result=response.status,content,response.getheader("Set-Cookie")
        connection.close();return result

    def test_complete_account_isolation_and_persistence(self):
        self.assertEqual(self.request('/api/plans')[0],401)
        self.assertEqual(self.request('/api/demo',{})[0],401)
        a=dict(name='niklas-test',password='test-salasana-123')
        b=dict(name='aatu-test',password='eri-salasana-123')
        self.assertEqual(self.request('/api/register',a,origin=False)[0],403)
        self.assertEqual(self.request('/api/register',a)[0],201)
        self.assertEqual(self.request('/api/register',a)[0],400)
        self.assertEqual(self.request('/api/login',dict(a,password='vaara-salasana'))[0],400)
        status,_,cookie=self.request('/api/login',a)
        self.assertEqual(status,200);self.assertIn('HttpOnly',cookie);self.assertIn('SameSite=Strict',cookie)
        token=cookie.split(';')[0]
        plan=dict(rows=demo_rows()[:8],devices=[dict(name='Pesukone',power=1,minutes=30)],capacity=2,tariffs={})
        self.assertEqual(self.request('/api/optimize',plan,token)[0],200)
        self.assertEqual(self.request('/api/save',dict(name='Oma suunnitelma',payload=plan),token)[0],201)
        plans=self.request('/api/plans',cookie=token)[1]['plans']
        self.assertEqual(len(plans),1)
        self.assertEqual(self.request('/api/register',b)[0],201)
        other=self.request('/api/login',b)[2].split(';')[0]
        self.assertEqual(self.request('/api/plans',cookie=other)[1]['plans'],[])
        self.request('/api/delete',dict(id=plans[0]['id']),other)
        self.assertEqual(len(self.request('/api/plans',cookie=token)[1]['plans']),1)
        restarted=Store(self.path)
        with restarted.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM plans').fetchone()[0],1)
            stored=db.execute('SELECT hash FROM users WHERE name=?',(a['name'],)).fetchone()[0]
            self.assertNotEqual(stored,a['password'])
        self.request('/api/logout',{},token)
        self.assertEqual(self.request('/api/plans',cookie=token)[0],401)

    def test_private_files_not_served(self):
        for path in ['/server.py','/.local/energy.sqlite3','/../core.py']:
            self.assertEqual(self.request(path)[0],404)

    def test_auth_and_invalid_json_shape(self):
        self.assertEqual(self.request('/api/register',dict(name='x',password='short'))[0],400)
        self.assertEqual(self.request('/api/optimize',[])[0],400)


if __name__ == '__main__': unittest.main()
