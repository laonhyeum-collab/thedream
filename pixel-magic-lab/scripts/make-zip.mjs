// 배포용 전체 프로젝트 압축 파일 만들기: npm run build 후 npm run zip
// (zip 명령이 있는 macOS / Linux / Git Bash 에서 동작합니다)
import { execSync } from 'node:child_process';
import fs from 'node:fs';

if (!fs.existsSync('dist/index.html')) {
  console.error('먼저 npm run build 를 실행해 주세요.');
  process.exit(1);
}
fs.rmSync('pixel-magic-lab.zip', { force: true });
execSync(
  'cd .. && zip -rq pixel-magic-lab/pixel-magic-lab.zip pixel-magic-lab -x "pixel-magic-lab/node_modules/*" "pixel-magic-lab/*.zip" "pixel-magic-lab/.DS_Store"',
  { stdio: 'inherit' },
);
console.log('pixel-magic-lab.zip 을 만들었어요.');
