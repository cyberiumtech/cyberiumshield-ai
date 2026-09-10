"""Train the optional URL risk model from a real labeled CSV.
CSV columns: url,label where label is 0=benign, 1=malicious.
Do not train on synthetic labels and call it AI. That would be decorative statistics wearing a tiny hat.
"""
import csv, os, sys
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from intel_engine import url_features

FEATURES = ['length','host_length','path_length','query_length','subdomain_depth','digit_ratio','hyphen_count','at_symbol','ip_host','punycode','https','suspicious_word_count','entropy']

if len(sys.argv) != 2:
    print('Usage: python train_model.py data/url_labels.csv'); raise SystemExit(2)
path=sys.argv[1]
X=[]; y=[]
with open(path, newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        if row.get('label') not in {'0','1'}: continue
        feats=url_features(row['url'].strip())
        X.append([feats[k] for k in FEATURES]); y.append(int(row['label']))
if len(set(y)) < 2 or len(y) < 100:
    raise SystemExit('Need at least 100 labeled URLs and both classes (0 and 1).')
Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.2,stratify=y,random_state=42)
model=RandomForestClassifier(n_estimators=400,max_depth=16,min_samples_leaf=2,class_weight='balanced',random_state=42,n_jobs=-1)
model.fit(Xtr,ytr)
p=model.predict_proba(Xte)[:,1]
print(classification_report(yte, [int(v>=.5) for v in p], digits=4))
print('ROC-AUC:', round(roc_auc_score(yte,p),4))
os.makedirs(os.path.dirname(os.getenv('MODEL_PATH','models/risk_model.joblib')) or '.', exist_ok=True)
joblib.dump(model, os.getenv('MODEL_PATH','models/risk_model.joblib'))
print('Saved model.')
