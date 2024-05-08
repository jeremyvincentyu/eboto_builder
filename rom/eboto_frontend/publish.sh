npm run build
echo $1 | sudo -S rsync -urv dist/ /var/www/html/
