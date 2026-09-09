import { useMemo, useState } from 'react'
import { vibrate } from '../../lib/notify'

type Q = { q: string; options: string[]; answer: number; why: string }

const BANK: Q[] = [
  {
    q: 'ระยะมาราธอนเต็มรูปแบบคือกี่กิโลเมตร?',
    options: ['21.1 กม.', '42.195 กม.', '50 กม.', '10 กม.'],
    answer: 1,
    why: 'มาราธอนมาตรฐานคือ 42.195 กม. ส่วนฮาล์ฟมาราธอนคือ 21.1 กม.',
  },
  {
    q: 'ก่อนวิ่งควรอบอุ่นร่างกายแบบไหนดีที่สุด?',
    options: ['ยืดค้างนาน ๆ', 'เคลื่อนไหวแบบไดนามิก', 'ไม่ต้องอบอุ่น', 'วิ่งเร็วสุดทันที'],
    answer: 1,
    why: 'การอบอุ่นแบบไดนามิก (แกว่งขา เดินเร็ว จ๊อกเบา ๆ) เตรียมกล้ามเนื้อได้ดีกว่าการยืดค้างก่อนวิ่ง',
  },
  {
    q: 'เพซ 6:00 นาที/กม. เท่ากับความเร็วประมาณเท่าไร?',
    options: ['8 กม./ชม.', '10 กม./ชม.', '12 กม./ชม.', '15 กม./ชม.'],
    answer: 1,
    why: '60 นาที ÷ 6 นาทีต่อกม. = 10 กม. ต่อชั่วโมง',
  },
  {
    q: 'กฎ 10% ในการซ้อมวิ่งหมายถึงอะไร?',
    options: [
      'เพิ่มระยะต่อสัปดาห์ไม่เกิน 10%',
      'วิ่งเร็วขึ้น 10% ทุกครั้ง',
      'พัก 10% ของเวลาวิ่ง',
      'ดื่มน้ำ 10% ของน้ำหนักตัว',
    ],
    answer: 0,
    why: 'เพิ่มระยะทางรวมต่อสัปดาห์ไม่เกิน 10% ช่วยลดความเสี่ยงบาดเจ็บจากการซ้อมหนักเกินไป',
  },
  {
    q: 'อาการ “หน้ามืด จุกเสียดชายโครง” ระหว่างวิ่งควรทำอย่างไร?',
    options: ['เร่งความเร็วให้ผ่านไป', 'ผ่อนความเร็วและหายใจลึก ๆ', 'กลั้นหายใจ', 'กระโดดแรง ๆ'],
    answer: 1,
    why: 'ผ่อนจังหวะ หายใจเข้าลึกออกยาว และกดบริเวณที่จุกเบา ๆ อาการมักดีขึ้น',
  },
  {
    q: 'รองเท้าวิ่งควรเปลี่ยนเมื่อใช้ไปประมาณกี่กิโลเมตร?',
    options: ['100–200 กม.', '300–500 กม.', '1,000–1,500 กม.', 'ไม่ต้องเปลี่ยน'],
    answer: 1,
    why: 'โดยทั่วไปโฟมรองรับแรงกระแทกจะเสื่อมที่ราว 300–500 กม.',
  },
  {
    q: 'วิ่งในอากาศร้อนควรดื่มน้ำอย่างไร?',
    options: ['ดื่มรวดเดียวก่อนวิ่ง', 'จิบทีละน้อยสม่ำเสมอ', 'ไม่ดื่มเลย', 'ดื่มหลังวิ่งอย่างเดียว'],
    answer: 1,
    why: 'จิบน้ำทีละน้อยตลอดการวิ่งช่วยรักษาสมดุลน้ำโดยไม่จุกท้อง',
  },
  {
    q: 'Cadence ในการวิ่งหมายถึงอะไร?',
    options: ['จำนวนก้าวต่อนาที', 'ความยาวก้าว', 'อัตราการเต้นหัวใจ', 'ความชันของทาง'],
    answer: 0,
    why: 'Cadence คือจำนวนก้าวต่อนาที นักวิ่งหลายคนตั้งเป้าราว 170–180 ก้าว/นาที',
  },
]

const ROUND = 5

export default function RunQuiz({ onFinish, best }: { onFinish: (score: number) => void; best: number }) {
  const questions = useMemo(() => [...BANK].sort(() => Math.random() - 0.5).slice(0, ROUND), [])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = questions[index]

  const choose = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === q.answer) {
      setScore((s) => s + 20)
      vibrate(20)
    } else {
      vibrate([100])
    }
  }

  const next = () => {
    if (index + 1 >= questions.length) {
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setPicked(null)
  }

  if (done) {
    return (
      <div>
        <div className="card center">
          <div style={{ fontSize: 46 }}>{score >= 80 ? '🥇' : score >= 40 ? '👏' : '📚'}</div>
          <div className="strong" style={{ fontSize: 30, marginTop: 8 }}>
            {score}
          </div>
          <div className="muted small">
            ตอบถูก {score / 20}/{questions.length} ข้อ · สถิติเดิม {best}
          </div>
        </div>
        <button className="btn primary block" style={{ marginTop: 14 }} onClick={() => onFinish(score)}>
          รับรางวัลและปิด
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="chip">
          ข้อ {index + 1}/{questions.length}
        </span>
        <span className="grow" />
        <span className="chip on">{score} คะแนน</span>
      </div>
      <div className="bar" style={{ marginBottom: 14 }}>
        <i style={{ width: `${((index + (picked !== null ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      <div className="card">
        <div className="strong" style={{ fontSize: 16, lineHeight: 1.6 }}>
          {q.q}
        </div>
      </div>

      <div className="stack-8" style={{ marginTop: 12 }}>
        {q.options.map((o, i) => (
          <button
            key={o}
            className={`quiz-opt ${picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : ''}`}
            onClick={() => choose(i)}
          >
            {o}
          </button>
        ))}
      </div>

      {picked !== null && (
        <>
          <div className="card tight small muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
            💡 {q.why}
          </div>
          <button className="btn primary block" style={{ marginTop: 12 }} onClick={next}>
            {index + 1 >= questions.length ? 'ดูผลลัพธ์' : 'ข้อถัดไป'}
          </button>
        </>
      )}
    </div>
  )
}
