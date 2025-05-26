# React Web IDE 프로젝트 현황

## 프로젝트 개요
웹 기반 React IDE로 a0.dev와 유사한 기능을 제공하며, AI를 통한 코드 수정 기능을 포함합니다.

## 구현된 주요 기능

### 1. 핵심 IDE 기능
- **Monaco Editor**: 브라우저 기반 코드 편집기
- **esbuild-wasm**: 브라우저에서 TypeScript/JSX 컴파일
- **실시간 프리뷰**: 코드 변경 시 1초 디바운스 후 자동 업데이트
- **파일 시스템**: 가상 파일 시스템 with 실제 파일 저장
- **계층적 파일 트리**: 폴더 확장/축소 가능한 파일 탐색기

### 2. AI 통합
- **Anthropic Claude API 연동**: Claude 3.5 Haiku 모델 사용
- **자동 파일 조작**: AI가 파일 생성/수정/삭제 가능
- **Tool Use XML 형식**: 더 자율적인 AI 작업을 위한 XML 도구 사용
- **터미널 명령 실행**: AI만 터미널 명령 실행 가능 (보안상 사용자는 불가)
- **에러 도움말**: "Ask AI for help" 버튼으로 에러 해결 지원

### 3. 인증 시스템
- **JWT 기반 인증**: 24시간 유효 토큰
- **역할 기반 접근 제어**: admin/user 구분
- **관리자 계정**: 
  - ID: `admin`
  - PW: `admin123`
- **관리자만 IDE 접근 가능**: 일반 사용자는 접근 불가

### 4. 프로젝트 관리
- **프로젝트 초기화**: 시작 시 프로젝트 이름 입력
- **React Vite 템플릿**: 자동으로 React + TypeScript + Vite 설정
- **사용자별 프로젝트 분리**: `/user-projects/{username}-{projectName}` 구조
- **격리된 프로젝트 환경**: 각 프로젝트는 독립된 디렉토리

### 5. UI/UX 개선사항
- **프로젝트 설정 오버레이**: 깔끔한 프로젝트 생성 UI
- **로딩 애니메이션**: 프로젝트 생성 시 스피너
- **에러 표시**: 빌드/런타임/터미널 에러를 명확히 표시
- **채팅 인터페이스**: 슬라이드 패널 형태의 AI 채팅
- **반응형 레이아웃**: 3열 구조 (파일트리, 에디터, 프리뷰)

## 기술 스택
- **Frontend**: React, TypeScript, React Router, Monaco Editor
- **Backend**: Express.js, JWT, bcryptjs
- **AI**: Anthropic Claude SDK
- **빌드**: Vite, esbuild-wasm
- **스타일**: CSS (커스텀)

## 보안 조치
- **터미널 접근 제한**: AI만 명령 실행 가능
- **파일 경로 검증**: 프로젝트 디렉토리 내에서만 작업
- **비밀번호 해싱**: bcrypt 사용
- **토큰 기반 인증**: Authorization 헤더 사용

## 파일 구조
```
/src
  /pages
    - IDE.tsx (메인 IDE 컴포넌트)
    - IDE.css (IDE 스타일)
    - Login.tsx (로그인 페이지)
    - Signup.tsx (회원가입 페이지)
  /contexts
    - AuthContext.tsx (인증 상태 관리)
  /components
    - ProtectedRoute.tsx (라우트 보호)
/server
  /routes
    - auth.js (인증 API)
    - chat.js (AI 채팅 API)
    - project.js (프로젝트 관리 API)
  /prompts
    - system-prompt.md (AI 시스템 프롬프트)
  /middleware
    - auth.js (JWT 검증)
  /data
    - users.json (사용자 데이터 - gitignored)
/user-projects (프로젝트 저장 디렉토리 - gitignored)
```

## 주요 문제 해결
1. **esbuild 초기화 에러**: 동적 스크립트 로드로 해결
2. **CSS 빌드 에러**: CSS import를 스텁 처리하고 별도로 주입
3. **파일 경로 문제**: AI가 프로젝트 루트 기준 전체 경로 사용하도록 수정
4. **프리뷰 창 문제**: main.tsx를 엔트리포인트로 변경, CSS 포함

## 현재 상태
- 모든 기본 기능 구현 완료
- 관리자 계정으로만 접근 가능
- AI가 자율적으로 파일 작업 수행
- 에러 발생 시 AI 도움 요청 가능
- 실시간 프리뷰와 자동 업데이트 작동

## 추가 개선 가능 사항
- 다중 프로젝트 관리
- 프로젝트 템플릿 선택
- 파일 업로드/다운로드
- Git 통합
- 협업 기능
- 더 많은 언어/프레임워크 지원