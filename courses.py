import requests
import xml.etree.ElementTree as ET
import csv
import time

# ✅ 1. 기본 설정
url = "https://api.everytime.kr/find/timetable/subject/list"
headers = {
    "Cookie": "_ga=GA1.1.1442799645.1758185067; x-et-device=11053426; etsid=s%3AzT3PkiR0QNrPtfyKc1W1rT6IGyzXF9hP.nBWZq%2BnRvsQl%2BgJPgUd%2BQxSBOueIug4xK5oiPQVG81s; _ga_85ZNEFVRGL=GS2.1.s1762472752$o8$g1$t1762474333$j60$l0$h0",
    "User-Agent": "Mozilla/5.0"
}

limit = 50  # 한 번에 불러올 개수
max_range = 5000  # 최대 과목 수 (필요시 조정)
all_subjects = []

for start in range(0, max_range, limit):
    params = {
        "campusId": 6,
        "year": 2025,
        "semester": 2,
        "limitNum": limit,
        "startNum": start
    }

    res = requests.get(url, params=params, headers=headers)
    
    if res.status_code != 200:
        print(f"요청 실패 (start={start})")
        break

    xml_text = res.text
    if "<subject" not in xml_text:
        print("모든 데이터 수집 완료")
        break

    # ✅ 3. XML 파싱
    root = ET.fromstring(xml_text)
    for subject in root.findall("subject"):
        subj_info = {
            "학수번호": subject.get("code"),
            "과목명": subject.get("name"),
            "교수명": subject.get("professor"),
            "학점": subject.get("credit"),
            "분반": subject.get("class"),
            "시간": subject.get("time"),
            "강의실": subject.get("room")
        }
        all_subjects.append(subj_info)

    print(f"📦 {start}~{start+limit-1} 데이터 수집 완료 ({len(all_subjects)}개 누적)")
    time.sleep(0.5)

filename = "everytime_subjects.csv"
with open(filename, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=all_subjects[0].keys())
    writer.writeheader()
    writer.writerows(all_subjects)

print(f"\n CSV 저장 완료 → {filename}")
