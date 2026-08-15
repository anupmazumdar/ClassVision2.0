from deepface import DeepFace

LABELS = ["angry","disgust","fear","happy","neutral","sad","surprise"]

def detect_emotion(frame):
    try:
        res = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False, silent=True)
        if isinstance(res, list):
            return [{"dominant": r["dominant_emotion"], "scores": r["emotion"]} for r in res]
        return [{"dominant": res["dominant_emotion"], "scores": res["emotion"]}]
    except: return []

def class_summary(emotion_list):
    if not emotion_list: return {}
    counts = {e:0 for e in LABELS}
    for em in emotion_list:
        if em["dominant"] in counts: counts[em["dominant"]] += 1
    total = len(emotion_list)
    return {k: round(v/total*100,1) for k,v in counts.items()}
