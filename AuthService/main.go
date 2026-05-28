package main

import ( 
	"goAuth/app" 
	config "goAuth/config/env" 
)

func main() { 
	config.Load()
	cfg := app.NewConfig()
	app := app.NewApp(cfg) 
	if err := app.Run(); err != nil {
		panic(err)
	}
}
//migrations : goose -dir db/migrations mysql $env:DB_DSN up