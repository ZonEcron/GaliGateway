# GALIGATEWAY

A standalone html file to act as gateway between a Galican Timer and FlowAgility platform.

## Usage
Connect your laptop **to Galican timer over wifi**, and **to internet over ethernet**.
Run the html on your laptop.
Type the Galican timer ip and connect
Type the generated mac on the Flow Agility platform secction to connect timers and press connect
Copy the url provided by Flow Agility platform
Type the url on the html and press connect

## CAPABILITIES
Currently just faults, refusals eliminations time and reset is supported.
Timer times will be sent to FlowAgility platform on each timer start and stop.
Faults, refusals, eliminations and reset will be sent to timer on each ocurrence in FlowAgility.

## EMULATION
A timer emulator and a FlowAgility server emulator are provided to be run for testing purposes.
NodeJS 18 or higher is required.
Unzip, and open a terminal in unziped fordel
Type ```npm i```to instal dependencies.
Type ```node FlowAgility_server_simulator.js``` to run FA simulator
In another terminal in unziped folder type ```node Galican_timer_simulator.js``` to run Galican timer simulator
In galican timer terminal press s + enter to simulate start and stop timer
In FA simulator type 11 symbols format to send fauls refusals and elimination i.e.: 
- i3210000000 will send 3 faults, 2 refusalas and 1 eliminated
- p0000000000 wil send a reset
se more about 11 symbols telegrams at: https://github.com/ZonEcron/ZonEcron-Interfacing/blob/main/WebsocketServer.md#3-message-diagram

