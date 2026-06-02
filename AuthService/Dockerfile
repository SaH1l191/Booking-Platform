FROM golang:1.23

WORKDIR /app

COPY . .

RUN go mod download
RUN go build -o auth-service .

EXPOSE 3001

CMD ["./auth-service"]
