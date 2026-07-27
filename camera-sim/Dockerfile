FROM alpine:3.19

RUN apk add --no-cache bash ffmpeg fontconfig ttf-dejavu

WORKDIR /app
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/bin/bash", "./entrypoint.sh"]
