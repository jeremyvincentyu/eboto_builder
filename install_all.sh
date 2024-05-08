#Create the Runtime Folder
mkdir eboto_runtime

#Install the Components
bash eboto_builder/installers/install_frontend.sh
bash eboto_builder/installers/install_poa.sh
bash eboto_builder/installers/install_isolator.sh
bash eboto_builder/installers/install_authority.sh

#Copy the nginx file and restart nginx
sudo cp eboto_builder/default /etc/default/nginx
sudo systemctl restart nginx

#Start Geth and Deploy the contract
echo "Run 'python3 eboto_builder/runners/run_geth.py' in one window and run 'bash rebuilders/deploy_poa.sh' in another to deploy the contract"




