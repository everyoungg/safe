Safe Link - 위치 모니터링 & 긴급 연락처 & 기기연결 & 카운트다운

기능
- 긴급 연락처 등록/삭제 (localStorage 저장)
- 위치 모니터링 시작/중지 + Google 지도 링크
- 20초 카운트다운 모달 (버튼 또는 `/?trigger=alert` URL)

개발 서버 실행
```bash
npm run dev
# http://localhost:3000 접속
```

벌셀(Vercel) 배포
1. GitHub에 이 폴더를 새 레포로 푸시
2. Vercel 대시보드에서 New Project → 해당 레포 선택 → Deploy
   - 또는 CLI: `npm i -g vercel` 후 프로젝트 루트에서 `vercel` 실행
3. 기본 설정(Framework: Next.js) 그대로 배포

주의사항
- 브라우저 위치 권한을 허용해야 위치 모니터링이 동작합니다.
- 긴급 전송은 현재 데모(alert)이며, 실제 신고/문자/콜 API 연동이 필요합니다.
