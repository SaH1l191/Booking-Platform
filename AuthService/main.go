package main

import ( 
	"goAuth/app" 
	config "goAuth/config/env" 
)


func main() {
	config.Load()
	cfg := app.NewConfig()
	app := app.NewApp(cfg) 
	app.Run(); 
}