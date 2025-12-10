"use client";

import React from "react";
import { Container, Typography, Button, Box } from "@mui/material";

export default function OshiGame() {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        推し活ミニゲーム
      </Typography>
      <Typography sx={{ mb: 4 }}>
        ここは推し活用のデモページです。好きな推しを応援しよう！
      </Typography>
      <Box textAlign="center">
        <Button variant="contained" color="secondary" size="large">
          ファンサ獲得！
        </Button>
      </Box>
    </Container>
  );
}
