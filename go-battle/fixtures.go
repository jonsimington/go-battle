package main

func FillDbWithTestData() {
	log.Infoln("Filling DB with test data")

	cravenCataloupeClient := Client{
		Repo:     "https://github.com/jonsimington/craven-cantaloupe",
		Language: "py",
		Game:     "chess",
	}
	madCherimoyaClient := Client{
		Repo:     "https://github.com/jonsimington/mad-cherimoya",
		Language: "py",
		Game:     "chess",
	}
	roundDurianClient := Client{
		Repo:     "https://github.com/jonsimington/round-durian",
		Language: "py",
		Game:     "chess",
	}
	gabbyMuskmelonClient := Client{
		Repo:     "https://github.com/jonsimington/gabby-muskmelon",
		Language: "py",
		Game:     "chess",
	}
	scientificLemonClient := Client{
		Repo:     "https://github.com/jonsimington/scientific-lemon",
		Language: "py",
		Game:     "chess",
	}
	animatedCoconutClient := Client{
		Repo:     "https://github.com/jonsimington/animated-coconut",
		Language: "py",
		Game:     "chess",
	}
	chubbyStrawberryClient := Client{
		Repo:     "https://github.com/jonsimington/chubby-strawberry",
		Language: "py",
		Game:     "chess",
	}
	expensiveGooseberryClient := Client{
		Repo:     "https://github.com/jonsimington/expensive-gooseberry",
		Language: "py",
		Game:     "chess",
	}
	vanBurenBoysClient := Client{
		Repo:     "https://github.com/jonsimington/the-van-buren-boys",
		Language: "js",
		Game:     "chess",
	}
	vanBurenBoyzClient := Client{
		Repo:     "https://github.com/jonsimington/the-van-buren-boyz",
		Language: "js",
		Game:     "chess",
	}
	randomValidMovesClient := Client{
		Repo:     "https://github.com/jonsimington/random-valid-moves",
		Language: "js",
		Game:     "chess",
	}
	nimbleNannerClient := Client{
		Repo:     "https://github.com/jonsimington/nimble-nanner",
		Language: "cpp",
		Game:     "chess",
	}
	godlyGrapefruitClient := Client{
		Repo:     "https://github.com/jonsimington/godly-grapefruit",
		Language: "cpp",
		Game:     "chess",
	}
	wanderingWatermelonClient := Client{
		Repo:     "https://github.com/jonsimington/wandering-watermelon",
		Language: "cpp",
		Game:     "chess",
	}
	observantOrangeClient := Client{
		Repo:     "https://github.com/jonsimington/observant-orange",
		Language: "cpp",
		Game:     "chess",
	}
	gruesomeGooseberryClient := Client{
		Repo:     "https://github.com/jonsimington/gruesome-gooseberry",
		Language: "cpp",
		Game:     "chess",
	}
	protectivePruneClient := Client{
		Repo:     "https://github.com/jonsimington/protective-prune",
		Language: "cpp",
		Game:     "chess",
	}
	puffyPitayaClient := Client{
		Repo:     "https://github.com/jonsimington/puffy-pitaya",
		Language: "cpp",
		Game:     "chess",
	}
	fragileFigClient := Client{
		Repo:     "https://github.com/jonsimington/fragile-fig",
		Language: "cpp",
		Game:     "chess",
	}
	braveBoysenberryClient := Client{
		Repo:     "https://github.com/jonsimington/brave-boysenberry",
		Language: "cpp",
		Game:     "chess",
	}
	littleLycheeClient := Client{
		Repo:     "https://github.com/jonsimington/little-lychee",
		Language: "cpp",
		Game:     "chess",
	}
	tallTangerineClient := Client{
		Repo:     "https://github.com/jonsimington/tall-tangerine",
		Language: "cpp",
		Game:     "chess",
	}
	puzzledPearClient := Client{
		Repo:     "https://github.com/jonsimington/puzzled-pear",
		Language: "cpp",
		Game:     "chess",
	}

	insertClient(db, &cravenCataloupeClient)
	insertClient(db, &madCherimoyaClient)
	insertClient(db, &roundDurianClient)
	insertClient(db, &gabbyMuskmelonClient)
	insertClient(db, &scientificLemonClient)
	insertClient(db, &animatedCoconutClient)
	insertClient(db, &chubbyStrawberryClient)
	insertClient(db, &expensiveGooseberryClient)
	insertClient(db, &vanBurenBoysClient)
	insertClient(db, &vanBurenBoyzClient)
	insertClient(db, &randomValidMovesClient)
	insertClient(db, &nimbleNannerClient)
	insertClient(db, &godlyGrapefruitClient)
	insertClient(db, &wanderingWatermelonClient)
	insertClient(db, &observantOrangeClient)
	insertClient(db, &gruesomeGooseberryClient)
	insertClient(db, &protectivePruneClient)
	insertClient(db, &puffyPitayaClient)
	insertClient(db, &fragileFigClient)
	insertClient(db, &braveBoysenberryClient)
	insertClient(db, &littleLycheeClient)
	insertClient(db, &tallTangerineClient)
	insertClient(db, &puzzledPearClient)

	cravenCataloupePlayer := Player{
		Name:   "Craven Cantaloupe",
		Client: cravenCataloupeClient,
	}
	madCherimoyaPlayer := Player{
		Name:   "Mad Cherimoya",
		Client: madCherimoyaClient,
	}
	roundDurianPlayer := Player{
		Name:   "Round Durian",
		Client: roundDurianClient,
	}
	gabbyMuskmelonPlayer := Player{
		Name:   "Gabby Muskmelon",
		Client: gabbyMuskmelonClient,
	}
	scientificLemonPlayer := Player{
		Name:   "Scientific Lemon",
		Client: scientificLemonClient,
	}
	animatedCoconutPlayer := Player{
		Name:   "Animated Coconut",
		Client: animatedCoconutClient,
	}
	chubbyStrawberryPlayer := Player{
		Name:   "Chubby Strawberry",
		Client: chubbyStrawberryClient,
	}
	expensiveGooseberryPlayer := Player{
		Name:   "Expensive Gooseberry",
		Client: expensiveGooseberryClient,
	}
	vanBurenBoysPlayer := Player{
		Name:   "The Van Buren Boys",
		Client: vanBurenBoysClient,
	}
	vanBurenBoyzPlayer := Player{
		Name:   "The Van Buren Boyz",
		Client: vanBurenBoyzClient,
	}
	randomValidMovesPlayer := Player{
		Name:   "Random Valid Moves",
		Client: randomValidMovesClient,
	}
	nimbleNannerPlayer := Player{
		Name:   "Nimble Nanner",
		Client: nimbleNannerClient,
	}
	godlyGrapefruitPlayer := Player{
		Name:   "Godly Grapefruit",
		Client: godlyGrapefruitClient,
	}
	wanderingWatermelonPlayer := Player{
		Name:   "Wandering Watermelon",
		Client: wanderingWatermelonClient,
	}
	observantOrangePlayer := Player{
		Name:   "Observant Orange",
		Client: observantOrangeClient,
	}
	gruesomeGooseberryPlayer := Player{
		Name:   "Gruesome Gooseberry",
		Client: gruesomeGooseberryClient,
	}
	protectivePrunePlayer := Player{
		Name:   "Protective Prune",
		Client: protectivePruneClient,
	}
	puffyPitayaPlayer := Player{
		Name:   "Puffy Pitaya",
		Client: puffyPitayaClient,
	}
	fragileFigPlayer := Player{
		Name:   "Fragile Fig",
		Client: fragileFigClient,
	}
	braveBoysenberryPlayer := Player{
		Name:   "Brave Boysenberry",
		Client: braveBoysenberryClient,
	}
	littleLycheePlayer := Player{
		Name:   "Little Lychee",
		Client: littleLycheeClient,
	}
	tallTangerinePlayer := Player{
		Name:   "Tall Tangerine",
		Client: tallTangerineClient,
	}
	puzzledPearPlayer := Player{
		Name:   "Puzzled Pear",
		Client: puzzledPearClient,
	}

	insertPlayer(db, &cravenCataloupePlayer)
	insertPlayer(db, &madCherimoyaPlayer)
	insertPlayer(db, &roundDurianPlayer)
	insertPlayer(db, &gabbyMuskmelonPlayer)
	insertPlayer(db, &scientificLemonPlayer)
	insertPlayer(db, &animatedCoconutPlayer)
	insertPlayer(db, &chubbyStrawberryPlayer)
	insertPlayer(db, &expensiveGooseberryPlayer)
	insertPlayer(db, &vanBurenBoysPlayer)
	insertPlayer(db, &vanBurenBoyzPlayer)
	insertPlayer(db, &randomValidMovesPlayer)
	insertPlayer(db, &nimbleNannerPlayer)
	insertPlayer(db, &godlyGrapefruitPlayer)
	insertPlayer(db, &wanderingWatermelonPlayer)
	insertPlayer(db, &observantOrangePlayer)
	insertPlayer(db, &gruesomeGooseberryPlayer)
	insertPlayer(db, &protectivePrunePlayer)
	insertPlayer(db, &puffyPitayaPlayer)
	insertPlayer(db, &fragileFigPlayer)
	insertPlayer(db, &braveBoysenberryPlayer)
	insertPlayer(db, &littleLycheePlayer)
	insertPlayer(db, &tallTangerinePlayer)
	insertPlayer(db, &puzzledPearPlayer)

	sampleTournament := Tournament{
		Name:   "A test Tournament",
		Type:   "swiss",
		Status: "Pending",
		Players: []Player{
			vanBurenBoysPlayer,
			braveBoysenberryPlayer,
			godlyGrapefruitPlayer,
			protectivePrunePlayer,
			madCherimoyaPlayer,
			fragileFigPlayer,
			expensiveGooseberryPlayer,
			animatedCoconutPlayer,
		},
	}

	insertTournament(db, &sampleTournament)
}
