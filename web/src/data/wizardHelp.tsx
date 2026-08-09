export const WIZARD_HELP = {
  testator: {
    title: "Who is the Testator?",
    body: (
      <>
        <p>The testator (or testatrix, if female) is simply the person making the Will — the owner of the assets being bequeathed. To make a valid Will in India, the testator must:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Be a major — 18 years of age or older</li>
          <li>Be of sound mind and understand what they are signing</li>
          <li>Sign the Will voluntarily, free from pressure or influence</li>
          <li>Have the legal right to dispose of the property being bequeathed</li>
        </ul>
        <p>You, as the testator, may leave your self-acquired property to whomever you choose.</p>
      </>
    ),
  },
  beneficiary: {
    title: "Who is a Beneficiary?",
    body: (
      <>
        <p>A beneficiary is anyone you choose to leave your assets to in your Will.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>It can be anyone:</strong> Family, friends, or a charity — not just legal heirs.</li>
          <li><strong>Can be a minor:</strong> But you must name a guardian to manage their share until they turn 18.</li>
          <li><strong>Should NOT be a witness:</strong> A beneficiary should not sign the Will as a witness, as it can disqualify them from receiving their inheritance.</li>
        </ul>
      </>
    ),
  },
  executor: {
    title: "What is an Executor?",
    body: (
      <p>An Executor is the trusted person responsible for distributing your assets according to your Will after your death. While optional, appointing an Executor ensures your wishes are smoothly carried out.</p>
    ),
  },
  guardian: {
    title: "What is a Guardian & Who Needs One?",
    body: (
      <>
        <p>A Guardian is a trusted adult you appoint in your Will to look after the assets left to any minor beneficiary (a child under 18 years of age).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Who requires a Guardian?</strong> Any beneficiary who is under 18 at the time of your passing.</li>
          <li><strong>What do they do?</strong> They manage, protect, and hold the child's inheritance in trust until the child reaches 18.</li>
          <li><strong>Who can you appoint?</strong> Anyone you trust who is over 18 — such as a surviving parent, relative, or close family friend.</li>
        </ul>
        <p><em>Note: If all your beneficiaries are adults, you can safely skip this step.</em></p>
      </>
    ),
  },
  residual: {
    title: "What is a Residuary Clause?",
    body: (
      <p>A residuary clause covers anything left over: any asset you own that isn't specifically listed elsewhere in this Will — including property you acquire after signing it, or something you simply forgot to mention. Rather than leaving that property undecided, this clause states clearly who should receive it.</p>
    ),
  },
  witness: {
    title: "Who can be a Witness?",
    body: (
      <>
        <p>Under the Indian Succession Act, 1925, any person of sound mind who is a major (18 or older) and capable of signing their own name can act as a witness. At least two witnesses are required, and neither needs to know what the Will actually says.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Signing:</strong> each witness must see the testator sign the Will, or be told directly that the signature is theirs. Both witnesses then sign in the testator's presence.</li>
          <li><strong>Not a beneficiary:</strong> avoid choosing someone who is also inheriting under the Will, or their spouse — for some communities, being a witness can void that person's own inheritance.</li>
          <li><strong>An executor can witness:</strong> the person managing your estate may also act as a witness.</li>
          <li><strong>Family members can witness</strong>, but an independent, impartial person is generally the safer choice to avoid any future dispute.</li>
        </ul>
      </>
    ),
  },
} as const;
