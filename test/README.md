# 3D Data Center Monitor

Three.js와 Vite로 만든 3D 서버실 관제 학습 프로젝트입니다.

## 주요 기능

- 3D 서버실 바닥과 벽, 조명
- 서버 랙 6개 및 서버 48대 표시
- 마우스 드래그 회전, 휠 확대/축소, 우클릭 드래그 이동
- 서버 클릭 시 IP, CPU, RAM, 상태 표시
- 정상/경고 LED 및 상단 집계 표시
- 카메라 초기화

> 현재 서버 상태와 CPU/RAM 값은 테스트용 임의 데이터입니다. 실제 장비 모니터링 기능은 포함되어 있지 않습니다.

## 기술 스택

- JavaScript (ES Modules)
- Three.js
- Vite
- HTML / CSS

## 요구 환경

- Node.js 20.19+ 또는 22.12+
- npm
- WebGL을 지원하는 최신 Chrome 또는 Edge

## 설치 및 실행

```bash
git clone https://github.com/YOUR_GITHUB_ID/3d-datacenter-monitor.git
cd 3d-datacenter-monitor
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 빌드 및 미리보기

```bash
npm run build
npm run preview
```

빌드 결과는 `dist/`에 생성됩니다.

## GitHub 업로드

GitHub에서 `3d-datacenter-monitor`라는 빈 저장소를 만든 후:

```bash
git init
git add .
git commit -m "Initial 3D data center monitor"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_ID/3d-datacenter-monitor.git
git push -u origin main
```

## 조작법

- 왼쪽 버튼 드래그: 3D 공간 회전
- 마우스 휠: 확대/축소
- 오른쪽 버튼 드래그: 화면 이동
- 서버 장비 클릭: 상세 정보 표시
- 카메라 초기화: 기본 시점으로 복귀

## 개발 로드맵

- [x] 3D 서버실 기본 모델
- [x] 서버 랙 6개 / 서버 48대
- [x] OrbitControls 카메라 조작
- [x] 서버 선택 및 상세 정보
- [x] 정상/경고 상태 표시
- [ ] 랙 단위 선택 및 확대
- [ ] 서버 상태 시뮬레이션
- [ ] Node.js API 및 WebSocket 연동
- [ ] 실제 Linux 서버 / SNMP / Redfish 연동

## License

MIT
