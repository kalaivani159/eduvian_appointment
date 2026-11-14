import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionAlternativeLike {
  transcript: string
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike
  isFinal: boolean
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [index: number]: SpeechRecognitionResultLike }
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const globalWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition ?? null
}

export function useVoice({
  onTranscript,
  onError,
}: {
  onTranscript: (text: string) => void
  onError?: (message: string) => void
}) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const timerRef = useRef<number | null>(null)
  const finalRef = useRef('')

  const supported = typeof window !== 'undefined' && getRecognitionCtor() !== null

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const cancel = useCallback(() => {
    finalRef.current = ''
    setInterim('')
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setListening(false)
    clearTimer()
    setElapsed(0)
  }, [clearTimer])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      onError?.(
        'Speech recognition is not available in this browser and the speech-to-text provider is not connected yet.',
      )
      return
    }
    const recognition = new Ctor()
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition
    finalRef.current = ''
    setElapsed(0)
    setListening(true)
    clearTimer()
    timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000)

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      if (finalText) finalRef.current = `${finalRef.current} ${finalText}`.trim()
      setInterim(interimText)
    }

    recognition.onerror = (event) => {
      setListening(false)
      clearTimer()
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        onError?.('Microphone permission was denied. Allow microphone access to use voice input.')
      } else if (event.error === 'no-speech') {
        onError?.('No speech was detected. Try again and speak clearly.')
      } else {
        onError?.(`Speech recognition stopped: ${event.error}.`)
      }
    }

    recognition.onend = () => {
      setListening(false)
      clearTimer()
      const transcript = finalRef.current.trim()
      if (transcript) onTranscript(transcript)
      setInterim('')
      finalRef.current = ''
    }

    try {
      recognition.start()
    } catch {
      setListening(false)
      clearTimer()
      onError?.('The microphone could not be started. Close other apps using it and try again.')
    }
  }, [clearTimer, onError, onTranscript])

  useEffect(() => () => clearTimer(), [clearTimer])

  return { supported, listening, interim, elapsed, start, stop, cancel }
}

export function useSpeech() {
  const [enabled, setEnabled] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const speak = useCallback(
    (text: string) => {
      if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#]/g, ''))
      utterance.lang = 'en-IN'
      utterance.rate = 1
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    },
    [enabled],
  )

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [])

  return { enabled, setEnabled, speak, speaking, stopSpeaking }
}
