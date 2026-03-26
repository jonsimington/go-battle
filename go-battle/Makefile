all:
	go run Server.go Match.go Player.go Game.go Client.go DB.go

clean:
	rm -rf tmp/

# Build all three player sandbox images.
build-player-images:
	docker build -t go-battle-player-py  -f player-images/py/Dockerfile  player-images/py/
	docker build -t go-battle-player-js  -f player-images/js/Dockerfile  player-images/js/
	docker build -t go-battle-player-cpp -f player-images/cpp/Dockerfile player-images/cpp/
