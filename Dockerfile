FROM node:18

RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY . .

RUN npm install
RUN pip3 install -r Requirements.txt

EXPOSE 5000

CMD python3 app.py & node index.js
