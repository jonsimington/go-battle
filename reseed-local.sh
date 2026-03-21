# reseed-local.sh ---
#
# Filename: reseed-local.sh
# Description:
#
# Author: DESKTOP-HB5BO59
# Created: Sat Apr 26 14:44:57 2025 (-0500)
docker compose down && sudo rm -rf postgres-data && unzip postgres-data.zip && mv go-battle/postgres-data . && docker compose up -d
