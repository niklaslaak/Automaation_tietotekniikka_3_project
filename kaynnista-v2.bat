@echo off
setlocal
cd /d "%~dp0"
if exist "v2\.venv\Scripts\python.exe" goto run
where py >nul 2>nul
if errorlevel 1 (
  echo Asenna ensin Python 3.12 tai uudempi ja Python Launcher.
  echo Sulje tama ikkuna, asenna Python ja kokeile uudelleen.
  pause
  exit /b 1
)
py -3 -m venv v2\.venv
if errorlevel 1 goto fail
:run
v2\.venv\Scripts\python.exe -c "import scipy, tzdata; assert scipy.__version__ == '1.17.0'" >nul 2>nul
if not errorlevel 1 goto start
echo Asennetaan laskennan riippuvuudet. Ensimmainen kaynnistys tarvitsee verkkoyhteyden.
v2\.venv\Scripts\python.exe -m pip install -r v2\requirements.txt
if errorlevel 1 goto fail
:start
echo Avaa selaimessa http://127.0.0.1:8765
echo Pida tama ikkuna auki sovelluksen kayton ajan.
v2\.venv\Scripts\python.exe v2\server.py
if errorlevel 1 goto fail
exit /b 0
:fail
echo Kaynnistys epaonnistui. Katso virhe ylla ja v2\README.md.
pause
exit /b 1
