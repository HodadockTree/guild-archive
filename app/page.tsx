"use client";

import { useState } from "react";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  
  const handleAddMember = () => {
    console.log("클릭됨");
    console.log(nickname);
  
    setMembers([...members, nickname]);
    setNickname("");
  };

  return (
    <main>
      <h1>냥춘 길드 활동 아카이브</h1>

      <p>인원 수: {members.length}</p>

      <input
        type="text"
        placeholder="닉네임 입력"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />

    <button onClick={handleAddMember}>
      등록
    </button>

    <ul>
  {members.map((member) => (
    <li key={member}>
      {member}
    </li>
  ))}
</ul>
    </main>
  );
}