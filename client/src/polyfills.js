import { Buffer } from 'buffer';
import process from 'process/browser';

if (typeof global === 'undefined') {
  window.global = window;
}

if (!window.Buffer) {
  window.Buffer = Buffer;
}

if (!window.process) {
  window.process = process;
}
