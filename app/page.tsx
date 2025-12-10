"use client";

import React from "react";
import { Container, Button, Typography, Box } from "@mui/material";
import Link from "next/link";

export default function Home() {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        トップページ
      </Typography>
      <Typography sx={{ mb: 4 }}>
        Next.js & MUI サンプル（ボタンで別ページへ遷移できます）
      </Typography>
      <Box textAlign="center">
        <Button component={Link} href="/oshi-game" variant="contained" color="primary" size="large">
          推し活ミニゲームへ
        </Button>
      </Box>
    </Container>
  );
}

