@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo  스마트 GIF 생성기 실행 중...
echo  (휴대폰 영상 포함 모든 포맷 지원)
echo ============================================

where python >nul 2>nul
if errorlevel 1 (
  echo [오류] Python이 필요합니다.
  echo Python 설치 후 다시 실행하세요.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:8080/"
python -m http.server 8080
pause
