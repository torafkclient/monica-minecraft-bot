@echo off
title LB.Dev Bot
chcp 65001 > nul
color 0d

cls
echo.
echo.
echo  ██╗     ██████╗    ██████╗ ███████╗██╗   ██╗
echo  ██║     ██╔══██╗   ██╔══██╗██╔════╝██║   ██║
echo  ██║     ██████╔╝   ██║  ██║█████╗  ██║   ██║
echo  ██║     ██╔══██╗   ██║  ██║██╔══╝  ╚██╗ ██╔╝
echo  ███████╗██████╔╝   ██████╔╝███████╗ ╚████╔╝ 
echo  ╚══════╝╚═════╝    ╚═════╝ ╚══════╝  ╚═══╝  
echo     Coded by CanBye / LB Developement
echo.
echo.

:start
echo  [~] Bot baslatiliyor...
echo  [!] Cikmak icin CTRL+C kullanin
echo.
node bot.js

echo.
echo  [!] Bot yeniden baslatiliyor...
timeout /t 5 > nul
goto start