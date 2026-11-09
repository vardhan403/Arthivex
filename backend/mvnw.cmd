@echo off
setlocal

set "MAVEN_CMD=mvn"
where mvn >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Users\HP\AppData\Local\Programs\apache-maven-3.9.9\bin\mvn.cmd" (
        set "MAVEN_CMD=C:\Users\HP\AppData\Local\Programs\apache-maven-3.9.9\bin\mvn.cmd"
    )
)

call "%MAVEN_CMD%" %*
exit /b %ERRORLEVEL%

