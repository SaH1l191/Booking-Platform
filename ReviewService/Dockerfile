FROM golang:1.23

WORKDIR /app

COPY . .

RUN go mod download
RUN go build -o review-service .

EXPOSE 3003

CMD ["./review-service"]
