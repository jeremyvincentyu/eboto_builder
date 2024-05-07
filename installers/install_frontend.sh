mkdir eboto_runtime/eboto_frontend
rsync -urv eboto_builder/rom/eboto_frontend/ eboto_runtime/eboto_frontend/
cd eboto_runtime/eboto_frontend
npm install
bash publish.sh