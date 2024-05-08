I recommend that you download the eBoto 2.0 development VM instead of installing eBoto 2.0 and its dependencies directly on your machine. This development VM is a Virtualbox Appliance. The username of the VM is jeremy and its password is Riemann_9. This whole source tree is present in the VM in the directory /home/jeremy/Documents/eBoto2, with the installation process already done.  

However, if you insist on developing locally or want to set up your own containerization, here's what you have to do:  
1. Install these dependencies: npm, python3-venv, nginx, rsync. You can use your Linux distro's package manager to do this. For npm, you may prefer to install the latest npm directly from the NPM website.

2.Install geth and clef into /usr/local/bin from release/1.13 of https://github.com/ethereum/go-ethereum

3. Run bash eboto_builder/install_all.sh, from the parent folder of the repo folder. You will need to provide your sudo password when prompted so that the nginx file gets copied to the correct place.  


To start eBoto 2.0, whether you are using the eBoto developer VM or running eBoto in your own container, do the following(make sure to follow the steps in the correct order):
1. Run python3 eboto_builder/rebuilders/reset.py and follow the prompts
2. Run python3 eboto_builder/runners/run_geth.py, following the prompts,  in that same window and wait until you see a mention of blocks being sealed
3. In another terminal window, run bash eboto_builder/rebuilders/deploy_poa.sh, following the prompts.
4. In another terminal window, run bash eboto_builder/runners/isolator.sh
5. In another terminal window, run bash eboto_builder/runners/authority.sh
6. Navigate to 127.0.0.1 in the browser.  

To terminate the backends, just enter Ctrl +C on each of the terminals that you opened.
For the frontend, it is sufficient to close your browser.

Following the instructions above result in another folder called eboto_runtime being created in the same folder as eboto_builder. Data files and a working copy of eBoto's source files are present in eboto_runtime. This separation is meant to prevent git from seeing the datafiles that are generated when running eBoto, so that git only tracks source files.

A video containing a functionality test of eBoto2, which doubles as a usage demo, is available at https://www.youtube.com/watch?v=TNGxuAhD1Rw

For some reason, attempting to combine steps 2 to 4 in start_instance.py using Python's subprocess module results in voters not being able to login during testing, among other unexplained bugs, but doing them separately results in a perfectly fine working setup.

The election authority's private key is in authority_daemon/data/authority.json.  
