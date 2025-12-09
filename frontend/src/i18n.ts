import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Simple language detector via localStorage, fallback to browser
const savedLang = localStorage.getItem('lang');
console.log('i18n init, savedLang:', savedLang);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          sloganTitle: 'A.I. Thought Universe',
          sloganSubtitle: '— Powered by {{ai}}, Designed for {{humans}}.',
          poweredByPrefix: '— Powered by',
            poweredByAffix: '',
          designedForPrefix: 'Designed for ',
            designedForAffix: '',
          AI: 'AI',
          Humans: 'Humans',
          welcomeQuestion: 'What shall we explore today?',
          inputPlaceholder: 'Type your question and press Enter…',
          noGraphs: 'No graphs yet, create your first question.',
          hello: 'Hello',
          enterChildNode: 'Please enter the content for the new child node',
            add: 'Send',
            questionBackground: 'Background',
            contextPrefix: 'I would like to further understand regarding my previous question "',
            contextAffix: '" the context you mentioned is "',
        }
      },
      zh: {
        translation: {
          sloganTitle: 'A.I. 思维宇宙',
          sloganSubtitle: '— 由{{ai}}驱动，为{{humans}}而设计。',
          poweredByPrefix: '— ',
            poweredByAffix: '加持',
          designedForPrefix: '服务',
            designedForAffix: '',
          AI: 'AI ',
          Humans: '人类',
          welcomeQuestion: '今天我们探索什么？',
          inputPlaceholder: '输入你的问题并回车…',
          noGraphs: '暂无探索图，创建第一个问题开始吧。',
            hello: '你好',
            enterChildNode: '请输入新的子节点内容',
            add: '发送',
            questionBackground: '问题背景',
            contextPrefix: '我想进一步了解 关于我刚才问你 “',
            contextAffix: '” 时你提到的 “',
        }
      }
    },
    lng: savedLang || (navigator.language.startsWith('zh') ? 'zh' : 'en'),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;
