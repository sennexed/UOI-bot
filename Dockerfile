FROM python:3.10-slim

# Install Node.js
RUN apt-get update && apt-get install -y nodejs npm

WORKDIR /app

COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r Requirements.txt

# Install Node dependencies
RUN npm install

EXPOSE 5000

CMD python app.py & node index.js
