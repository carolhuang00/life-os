// htm 讓我們不用建置工具，也能用類似 JSX 的寫法
import { h } from 'preact';
import htm from 'htm';

export const html = htm.bind(h);
