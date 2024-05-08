#Create the Runtime Folder
mkdir eboto_runtime

#Install the Components
bash eboto_builder/installers/install_frontend.sh
bash eboto_builder/installers/install_poa.sh
bash eboto_builder/installers/install_isolator.sh
bash eboto_builder/installers/install_authority.sh

#Copy the nginx file and restart nginx
sudo cp eboto_builder/default /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

#Start Geth and Deploy the contract
echo "Run 'python3 eboto_builder/runners/fresh_launcher.py' and supply the necessary passwords"




