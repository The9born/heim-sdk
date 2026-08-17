#!/bin/bash

if ! command -v protoc &> /dev/null
then
    echo "protoc could not be found. Please install Protocol Buffers globally."
    exit 1
fi

OUTPUT_DIR="./src/ts-proto"
if [ ! -d "$OUTPUT_DIR" ]; then
  echo "Creating directory: $OUTPUT_DIR"
  mkdir -p "$OUTPUT_DIR"
fi

# Compile all protos EXCEPT heim from the standard root
find ./src/proto -name "*.proto" ! -path "./src/proto/heim/*" -exec protoc \
  --plugin=../../node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./src/ts-proto \
  --proto_path=./src/proto \
  --ts_proto_opt="esModuleInterop=true,forceLong=long,useOptionals=messages" \
  {} +

# Compile heim protos with a specialized relative path config
(
  cd ./src/proto/heim && \
  protoc \
    --plugin=../../../node_modules/.bin/protoc-gen-ts_proto \
    --ts_proto_out=../../ts-proto/heim \
    --proto_path=. \
    --proto_path=.. \
    --ts_proto_opt="esModuleInterop=true,forceLong=long,useOptionals=messages" \
    heim/*.proto
)