import bite_rate_agent as a
def rev(*t): return [{"text":{"text":x}} for x in t]
good={"displayName":{"text":"Test Bageri"},"userRatingCount":40,"formattedAddress":"Bagargatan 1, Stockholm","location":{"latitude":59.33,"longitude":18.07},"reviews":rev("great buns","lovely","best cardamom bun","queue but worth it"),"googleMapsUri":"https://maps.google.com/?cid=1","businessStatus":"OPERATIONAL"}
llm=lambda n,h,t:{"positive_share":0.9,"cuts":["fika","bogus"],"area":"Södermalm","why":"Great buns.","get":"Cardamom bun","skip":"You hate queues"}
r,w=a.evaluate(good,set(),llm); print(w, r["cuts"], r["area"], r["id"]); assert w=="approved" and r["cuts"]==["fika"]
few=dict(good,userRatingCount=5); print(a.evaluate(few,set(),llm)[1]); assert a.evaluate(few,set(),llm)[0] is None
six=dict(good,userRatingCount=6); assert a.evaluate(six,set(),llm)[0] is not None
assert a.evaluate(good,{"test bageri"},llm)[1]=="already on the site"
bad=lambda n,h,t:{"positive_share":0.4,"cuts":["fika"]}; print(a.evaluate(good,set(),bad)[1])
def boom(*x): raise RuntimeError("ollama down")
print(a.evaluate(good,set(),boom)[1]); assert a.evaluate(good,set(),boom)[0] is None
assert a.evaluate(dict(good,businessStatus="CLOSED_PERMANENTLY"),set(),llm)[0] is None
print("ALL OK")

import sync_server as ss
ex = {"suggestions": [{"name": "Café Hit", "go": 7, "skip": 1}, {"name": "Café Meh", "go": 4, "skip": 0}, {"name": "Café Hit", "go": 9, "skip": 0}]}
c = ss.promote(ex, [], set())
assert [x["name"] for x in c] == ["Café Hit"] and c[0]["net"] == 6, c
assert ss.promote(ex, c, set()) == c, "idempotent"
print("SYNC OK")
