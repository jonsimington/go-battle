all:
	go run Server.go Match.go Player.go Game.go Client.go

deps:
	dep ensure 

dep-graph:
	dep status -dot | dot -T png -o status.png; start status.png

update-deps:
	dep ensure -update