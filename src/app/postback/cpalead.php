<?php
// This repository is a Next.js application and Vercel does not execute PHP files.
// The live endpoint is implemented at /postback/cpalead via Next.js route handling.
// See src/app/postback/cpalead/route.ts.
http_response_code(501);
header('Content-Type: text/plain');
echo 'Use the Next.js /postback/cpalead endpoint.';
