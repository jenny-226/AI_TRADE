# TRADE PASS
## Hogwarts House Edition — 국제무역사 학습 플랫폼 개발 README (업데이트 버전)

> 이 문서는 VS Code에서 AI 코딩 도구(Copilot, Cursor, ChatGPT Code 등)를 사용해 **TRADE PASS** 웹 플랫폼을 구현하기 위한 개발 명세서다.  
> 서비스의 핵심은 **국제무역사 개념 정리 + 기숙사 테마 + 게임형 퀴즈**이며, 사용자는 마법학교에 입학한 학생처럼 학습을 진행한다.  
> 기본 언어는 **한국어**이며, 우측 상단 토글 버튼으로 **English**로 전환할 수 있어야 한다.

---

# 1. 서비스 핵심 방향

## 1-1. 목적
이 플랫폼의 목적은 아래 3가지다.

1. **국제무역사 과목별 핵심 개념을 체계적으로 정리해서 보여준다.**
2. **개념 페이지 옆에서 사용자가 원할 때 언제든 퀴즈를 시작할 수 있게 한다.**
3. **기숙사 테마에 맞춘 게임형 퀴즈를 통해 개념을 반복 학습하게 한다.**

즉, 이 서비스는 인강 청취 중심 플랫폼이 아니라,

- **개념 정리**를 읽고
- **바로 퀴즈 버튼을 눌러** 학습하고
- **게임처럼 스토리를 따라가며 문제를 풀고**
- **과목별 진도를 쌓는 학습 플랫폼**이다.

---

# 2. 전체 콘셉트

## 2-1. 세계관
- 사용자는 **호그와트 스타일 마법학교에 입학한 학생**이다.
- 입학 전에 **4개 기숙사 중 하나**를 선택한다.
- 홈 화면은 선택한 기숙사의 **휴게실(Common Room)** 테마로 바뀐다.
- 학습 진도는 학생의 수강 현황과 과목별 이수율처럼 보여준다.
- 퀴즈는 단순 객관식이 아니라, **캐릭터가 이동하며 문제를 해결하는 RPG형 시나리오 퀘스트**로 구성한다.

## 2-2. 분위기
- 딱딱하고 전통적인 수험 플랫폼 느낌은 피한다.
- 몰입감 있고 감성적인 마법학교 분위기를 준다.
- 다만, 퀴즈와 개념의 핵심 내용은 **국제무역사 학습에 정확히 맞아야 한다.**

---

# 3. 언어 정책

## 3-1. 기본 언어
- 기본 언어는 **한국어**다.
- 우측 상단에 `한국어 | English` 토글 버튼을 둔다.

## 3-2. 언어 전환 대상
언어 토글 시 아래 항목이 바뀌어야 한다.

- 네비게이션 메뉴
- 페이지 제목
- 버튼 텍스트
- 과목명 / 챕터명
- 퀴즈 지문, 선택지, 해설
- 학사 기록부 라벨
- 시스템 메시지

## 3-3. 언어 전환 예외
아래는 번역하지 않는다.

- 사용자가 직접 쓴 개인 메모
- 사용자 입력 이름
- 저장된 자유 텍스트

---

# 4. 기술 스택

- React + TypeScript + Vite
- Tailwind CSS
- React Router DOM
- Zustand 또는 Context API
- Framer Motion
- Recharts
- localStorage
- Lucide React

---

# 5. 실행 방법

## 5-1. 프로젝트 생성
```bash
npm create vite@latest trade-pass -- --template react-ts
cd trade-pass
npm install
```

## 5-2. 라이브러리 설치
```bash
npm install react-router-dom zustand recharts lucide-react framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## 5-3. 개발 서버 실행
```bash
npm run dev
```

---

# 6. 사용자 진입 플로우

## 6-1. 전체 플로우
1. 랜딩 페이지
2. 기숙사 선택
3. 학생 등록
4. 기숙사 휴게실 홈
5. 과목 선택
6. 개념 정리 페이지
7. 우측 `퀴즈 풀기` 버튼 클릭
8. 퀘스트 시작 전 성별 선택
9. 랜덤 학생 캐릭터 생성
10. 게임형 퀴즈 진행
11. 결과 반영 및 학사 기록 업데이트

---

# 7. 필수 페이지 구조

## 7-1. `/houses` — 기숙사 선택 페이지

### 목적
- 사용자가 앱 이용 전에 반드시 4개 기숙사 중 하나를 선택하게 한다.
- 선택한 기숙사에 따라 앱 전체 테마가 달라진다.

### 필수 구성
- 4개 기숙사 엠블럼/카드
- 기숙사 이름
- 분위기 설명
- 선택 효과
- `입학하기` 버튼

### 기숙사
- Gryffindor / 그리핀도르
- Ravenclaw / 래번클로
- Hufflepuff / 후플푸프
- Slytherin / 슬리데린

### 저장
- `selectedHouse`

---

## 7-2. `/onboarding` — 학생 등록 페이지

### 입력 항목
- 이름
- 응시 시험 드롭다운
  - 국제무역사
  - 무역영어

### 제거할 항목
- 학습 레벨 선택 없음
- 초급/중급/고급 구분 없음

### 저장
- `studentName`
- `selectedExam`

---

## 7-3. `/home` — 기숙사 휴게실 홈

### 목적
- 사용자가 기숙사에 입학한 학생처럼 느끼게 한다.
- 동시에 과목별 학습 진도를 한눈에 확인하게 한다.

### 필수 표시 요소
- 기숙사명
- 학생 이름
- 응시 시험
- 과목별 개념 이수율
- 오늘의 학습 추천
- 최근 퀴즈 결과
- 복습 필요 챕터
- 학사 기록 바로가기

### UI 연출
- 그리핀도르: 벽난로, 붉은 커튼, 금색 포인트
- 래번클로: 서가, 별빛, 푸른 톤
- 후플푸프: 따뜻한 조명, 목재, 식물
- 슬리데린: 석조 벽, 초록빛, 물결 반사

---

## 7-4. `/concepts` — 개념 정리 페이지

### 목적
- 과목별 핵심 개념을 학습한다.
- 동시에 메모를 작성한다.
- 사용자가 **원할 때 즉시 퀴즈를 시작**할 수 있게 한다.

### 레이아웃
**좌측**: 과목/챕터 목록  
**중앙**: 개념 정리 본문  
**우측**: 개인 메모장 + `퀴즈 풀기` 버튼

### 중앙 콘텐츠 구성
- 챕터 제목
- 핵심 요약
- 상세 설명
- 시험 포인트
- 비교표
- 오답 포인트

### 우측 패널 구성
- 개인 메모장
- 자동 저장 상태 표시
- `퀴즈 풀기` 버튼 (항상 우측 상단 또는 우측 패널 상단 고정)

### 메모 저장 규칙
과목과 챕터에 연결해 저장한다.

예시:
- `국제무역사 > 무역계약 > Incoterms 메모`
- `국제무역사 > 무역결제 > 신용장 메모`

---

# 8. 게임형 퀴즈 페이지 설계 (핵심)

## 8-1. `/quiz` — 퀘스트형 퀴즈 페이지

이 페이지가 이번 수정의 핵심이다.

사용자는 단순히 문제를 푸는 것이 아니라, **마법학교 학생 캐릭터가 시나리오를 진행하다가 중간에 무역 문제가 나오면 해결하며 앞으로 나아가는 방식**으로 플레이한다.

---

## 8-2. 퀴즈 시작 전 단계

### Step 1. 성별 선택
퀴즈를 시작할 때 사용자는 성별을 선택한다.

옵션:
- 남학생
- 여학생

### Step 2. 학생 캐릭터 랜덤 생성
성별을 선택하면,
- 이전에 선택한 **기숙사 테마 교복**을 입고
- 선택한 성별에 맞는
- **학생 캐릭터가 랜덤으로 생성**된다.

### 캐릭터 생성 규칙
- 동일한 기숙사라도 얼굴, 머리색, 헤어스타일, 표정, 액세서리 정도는 랜덤
- 남/녀 각각 3~5종 이상 랜덤 풀 구성
- 단, **모든 캐릭터는 공식 해리포터 캐릭터를 그대로 복제하지 않고 오리지널 학생 느낌**으로 생성

### 예시
- 슬리데린 선택 + 남학생 선택 → 슬리데린 교복을 입은 남학생 캐릭터 랜덤 배정
- 래번클로 선택 + 여학생 선택 → 래번클로 교복을 입은 여학생 캐릭터 랜덤 배정

### 저장
- `quizCharacterGender`
- `quizCharacterVariant`
- `quizCharacterHouse`

---

## 8-3. 퀴즈의 기본 구조

퀴즈는 아래 순서로 진행한다.

1. 퀘스트 인트로
2. 캐릭터 등장
3. 스토리 진행
4. 체크포인트 도달
5. 무역 문제 출제
6. 정답 여부 판정
7. 정답이면 다음 장면 진행
8. 오답이면 해당 체크포인트 이전의 **같은 시나리오 구간으로 되돌아감**
9. 다시 문제에 도전
10. 최종 도착 시 퀘스트 완료

---

## 8-4. 핵심 UX 규칙

### 정답 시
- 캐릭터가 다음 장면으로 이동
- 새 배경/새 상황 진입
- 진행률 증가
- 짧은 성취 연출 제공

### 오답 시
- `틀렸습니다`에서 끝나지 않는다.
- 캐릭터가 **직전 시나리오 체크포인트로 다시 돌아간다.**
- 사용자는 같은 상황을 다시 보고, 다시 문제를 풀어야 한다.
- 즉, **틀리면 스토리가 끊기고 처음부터 전체를 다 반복하는 것이 아니라, 해당 장면 단위(checkpoint)로 돌아가 재도전**한다.

### 예시 플로우
- 장면 1: 교수에게 임무 받기
- 장면 2: 항구 도착
- 장면 3: 문제 출제
- 틀릴 경우 → 장면 2로 복귀 후 다시 장면 3 문제 풀이
- 맞히면 → 장면 4로 이동

---

## 8-5. 퀴즈 시나리오 구조

퀴즈는 과목별/챕터별로 나뉜다.

### 예시
#### 무역계약 > Incoterms 퀘스트
- 호그와트에서 다른 마법학교로 교과서를 보낸다.
- 항구까지 이동 중 거래조건 문제가 발생한다.
- 사용자는 CIF, FOB, FCA의 차이를 이해해야 다음 구간으로 갈 수 있다.

#### 무역결제 > 신용장 퀘스트
- 학생은 교역 담당 조수로 서류를 전달한다.
- 중간에 신용장 관련 질문이 나오고 맞혀야 은행 구간을 통과할 수 있다.

#### 무역규범 > 통관 퀘스트
- 마법 물품을 다른 나라로 반입하는 과정에서 통관 문이 막힌다.
- 적절한 신고/통관 절차 문제를 풀어야 다음 지역으로 이동 가능하다.

---

## 8-6. 기숙사별 퀴즈 톤

문제의 개념은 동일하지만 연출은 달라진다.

### Gryffindor
- 모험형
- 용감한 탐험 분위기
- 붉은 톤, 역동적 연출

### Ravenclaw
- 분석형
- 문서 해석과 논리 중심 분위기
- 푸른 톤, 지적인 연출

### Hufflepuff
- 협력형
- 차근차근 배우는 안정적 분위기
- 따뜻한 톤, 친근한 연출

### Slytherin
- 전략형
- 효율과 선택 중심 분위기
- 초록 톤, 날카로운 연출

---

## 8-7. 퀴즈 UI 구성

### 상단
- 현재 과목/챕터
- 퀘스트 제목
- 진행률 바
- 언어 전환 버튼
- 나가기 버튼

### 중앙
- 스토리 일러스트 영역 / 배경 장면
- 학생 캐릭터 표시
- 대사/설명 텍스트

### 하단 또는 우측
- 문제 영역
- 선택지 4개
- 정답 확인 버튼
- 힌트 버튼(선택)

### 정답 후
- `계속 진행하기`

### 오답 후
- `체크포인트로 돌아가기`
- 자동 복귀 후 재도전

---

# 9. 과목 구조

## 국제무역사
### 무역규범
- 대외무역법
- 통관절차
- 관세
- FTA
- 원산지

### 무역결제
- 송금방식
- 추심방식
- 신용장
- UCP 600
- 환어음

### 무역계약
- 계약의 성립
- Incoterms
- 운송서류
- 보험
- 클레임

### 무역영어
- 계약 영어
- 결제 영어
- 운송 영어
- 클레임 영어
- 무역 용어

---

# 10. 학사 기록부

## `/record`

### 목적
- 학습 결과와 과목별 진행도를 보여준다.

### 표시 항목
- 과목별 개념 이수율
- 챕터별 퀘스트 완료율
- 퀴즈 정답률
- 자주 틀리는 개념
- 메모 작성 수
- 최근 완료한 퀘스트

### 학생 느낌의 표현 예시
- `무역계약 수강 진도`
- `신용장 퀘스트 완수율`
- `이번 주 가장 어려웠던 챕터`

---

# 11. 데이터 저장 항목

```ts
selectedHouse
studentName
selectedExam
language
subjectNotes
subjectProgress
quizCharacterGender
quizCharacterVariant
quizProgress
quizCheckpoint
quizHistory
recordData
```

---

# 12. 스크롤 최소화 원칙

- 한 화면에 모든 요소를 몰아넣지 않는다.
- 개념 페이지는 **중앙 개념 / 우측 메모 / 우측 퀴즈 버튼** 구조로 명확히 분리한다.
- 퀴즈는 **한 번에 한 문제**만 보여준다.
- 스토리 장면은 슬라이드/카드처럼 전환한다.
- 오답 시 전체 긴 페이지 스크롤을 다시 하지 않게 한다.

---

# 13. 권장 폴더 구조

```bash
src/
  assets/
    houses/
    characters/
    backgrounds/
  components/
    common/
    layout/
    house/
    concepts/
    quiz/
    record/
  data/
    houses.ts
    subjects.ts
    chapters.ts
    concepts.ts
    quizzes.ts
    characters.ts
  pages/
    LandingPage.tsx
    HouseSelectionPage.tsx
    OnboardingPage.tsx
    HomePage.tsx
    ConceptsPage.tsx
    QuizIntroPage.tsx
    QuizPlayPage.tsx
    RecordPage.tsx
  store/
    useAppStore.ts
    useHouseStore.ts
    useQuizStore.ts
  types/
    index.ts
  App.tsx
  main.tsx
```

---

# 14. 구현 우선순위 (MVP)

반드시 먼저 구현해야 할 것:

1. 기숙사 선택
2. 이름 + 시험 선택 등록
3. 기숙사별 홈 화면
4. 개념 정리 페이지 + 메모장 + 우측 퀴즈 버튼
5. 퀴즈 시작 전 성별 선택
6. 랜덤 학생 캐릭터 생성
7. 스토리형 퀘스트 진행
8. 오답 시 체크포인트 복귀 시스템
9. 학사 기록부 반영
10. 한국어/English 토글

---

# 15. AI 코딩 도구용 최종 프롬프트

```text
Build a React + TypeScript + Vite web app called TRADE PASS.

The app is a Hogwarts-inspired study platform for International Trade Specialist exam students.

Core requirements:
1. Users must choose one of four houses before entering the platform.
2. After choosing a house, the platform theme and home screen must change into that house’s common room.
3. The onboarding page must only ask for the student's name and a dropdown exam choice: 국제무역사 or 무역영어.
4. The concept study page must focus on subject-by-subject concept summaries.
5. On the concept page, place a “퀴즈 풀기” button on the right side so the learner can start a quiz anytime.
6. Before starting a quiz, the user must choose gender: male or female student.
7. Then generate a random student character that matches the previously selected house uniform and the chosen gender.
8. The quiz must be game-like. The character moves through a scenario, and questions appear in the middle of the story.
9. If the user answers correctly, the story continues and the character moves forward.
10. If the user answers incorrectly, send the user back to the previous scenario checkpoint and let them solve the same scenario again before moving on.
11. The quiz tone and visuals should reflect the selected house, but the educational concept and correctness must remain accurate.
12. Default language is Korean, with a top-right Korean/English toggle.
13. Save notes by subject and chapter.
14. Save quiz character settings, checkpoints, and progress.
15. Keep the UI immersive, magical, and engaging, but clear and not cluttered.
```

---

# 16. 완료 기준

- [ ] 기숙사 선택 가능
- [ ] 이름 + 시험 선택만 입력 가능
- [ ] 홈이 기숙사 휴게실 테마로 변경됨
- [ ] 개념 페이지 우측에 퀴즈 버튼 존재
- [ ] 퀴즈 시작 전 성별 선택 가능
- [ ] 선택한 기숙사 교복의 랜덤 학생 캐릭터 생성됨
- [ ] 게임형 시나리오 진행 중 문제 출제됨
- [ ] 정답 시 다음 장면으로 진행됨
- [ ] 오답 시 체크포인트로 되돌아가 같은 시나리오 재도전 가능
- [ ] 학사 기록부에 반영됨
- [ ] 한국어/English 전환 가능

