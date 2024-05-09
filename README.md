I recommend that you download the eBoto 2.0 development VM instead of installing eBoto 2.0 and its dependencies directly on your machine. This development VM is a Virtualbox Appliance. The username of the VM is jeremy and its password is Riemann_9. This whole source tree is present in the VM in the directory /home/jeremy/Documents/eBoto2, with the installation process already done.  

However, if you insist on developing locally or want to set up your own containerization, here's what you have to do:  
1. Install these dependencies: npm, python3-venv, nginx, rsync. You can use your Linux distro's package manager to do this. For npm, you may prefer to install the latest npm directly from the NPM website. 

2.Install geth and clef into /usr/local/bin from release/1.13 of https://github.com/ethereum/go-ethereum  

3. Run bash eboto_builder/install_all.sh, from the parent folder of the repo folder. You will need to provide your sudo password when prompted so that the nginx file gets copied to the correct place.  


To start eBoto 2.0, whether you are using the eBoto developer VM or running eBoto in your own container, do the following(make sure to follow the steps in the correct order):  
1. Run python3 eboto_builder/runners/fresh_launcher.py  
2. Navigate to 127.0.0.1 in the browser.  

If you wish to resume without clearing all data, run python3 eboto_builder/runners/resume_launcher.py  

Following the instructions above result in another folder called eboto_runtime being created in the same folder as eboto_builder. Data files and a working copy of eBoto's source files are present in eboto_runtime. This separation is meant to prevent git from seeing the datafiles that are generated when running eBoto, so that git only tracks source files.  

The election authority's private key is in eboto_runtime/authority_daemon/data/authority.json, after every use of fresh_launcher.py  

If you wish to deploy this in production, change the "default" file to match your SSL configuration, and add a SSL proxy to your geth port in default, like so:  

server {
	listen 47298 ssl default_server http2;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_certificate /etc/nginx/ssl/eboto.crt;
        ssl_certificate_key /etc/nginx/ssl/eboto.key;
	location /{
	proxy_pass http://127.0.0.1:8545/; 
	}

}

Finally, change Web3 rpc port in rom/eboto_frontend/src/main.tsx to match the SSL proxy you configured for your Geth instance:  

Continuing from the example above,  
const web3_instance = new Web3("http://127.0.0.1:8545")  
should be changed into  
const web3_instance = new Web3("https://neweboto.xyz:47298")

Note that I use port 47298, but you can use any port that you have available.
neweboto.xyz is my domain, but you can also change it to point to your own domain.
