// discord-notify-pr-review-request
// Copyright (c) 2022-present Captos Co., Inc.

const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

const ENCODE_PAIR = {
  "<": "&lt;",
  ">": "&gt;",
};
const encodeText = (text) =>
  text.replace(/[<>]/g, (matched) => ENCODE_PAIR[matched]);
const fetchUser = (url) =>
  axios({
    method: "get",
    headers: {
      Authorization: `token ${core.getInput("token")}`,
    },
    url,
  }).then((res) => res.data);
const D0 = "D-0";
const sendDiscord = ({ repoName, labels, title, url, email }) => {
  const [name] = email.split("@");
  const d0exists = labels.some((label) => label.name === D0);

  return axios({
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    url: `${core.getInput("discordWebhookUrl")}`,
    data: {
      username: "Github Actions[bot]",
      description: "",
      embeds: [
        {
          author: {
            name: `@${name}`,
          },
          title: "새로운 리뷰 요청이 도착했어요! 😊",
          description: `📬 <@${name}> 님 새로운 리뷰 요청이 도착했어요! 가능한 빠르게 리뷰에 참여해 주세요:`,
          fields: [
            {
              name: `*${repoName}:*`,
              value: `<${url}|${encodeText(title)}>`,
            },
            // ...(labels.length
            //     ? [
            //         {
            //           type: "actions",
            //           elements: labels.map(({ name }) => ({
            //             type: "button",
            //             text: {
            //               type: "plain_text",
            //               text: name,
            //             },
            //             ...(name === D0 ? { style: "danger" } : {}),
            //           })),
            //         },
            //       ]
            //     : []),
            ...(d0exists
              ? [
                  {
                    name: `*🚨 \`${D0}\` PR로 매우 긴급한 PR입니다! 지금 바로 리뷰에 참여해 주세요! 🚨*`,
                    value: "",
                  },
                ]
              : []),
            {
              name: "",
              value:
                "💪 코드 리뷰는 코드 품질을 향상시키고, 버그를 줄이며, 팀원 간의 지식 공유와 협업을 촉진하는 핵심 프로세스입니다.\n🙏 적극적인 참여와 의견을 부탁드립니다.",
            },
          ],
        },
      ],
    },
  });
};
(async () => {
  try {
    const {
      context: {
        payload: {
          pull_request: { title, html_url: prUrl, labels },
          sender,
          requested_reviewer: { login, url },
          repository: { full_name: repoName },
        },
      },
    } = github;

    core.notice(`Sender: ${sender.login}, Receiver: ${login}, PR: ${prUrl}`);
    core.info(`'${sender.login}' requests a pr review for ${title}(${prUrl})`);
    core.info(`Fetching information about '${login}'...`);

    const { email } = await fetchUser(url);

    core.info(`Sending a discord msg to '${login}'...`);

    if (!email) {
      core.warning(`Failed: '${login}' has no public email.`);
      core.notice(`Failed: '${login}' has no public email.`);

      return;
    }

    await sendDiscord({ repoName, labels, title, url: prUrl, email });

    core.info("Successfully sent");
    core.notice("Successfully sent");
  } catch (error) {
    core.setFailed(error.message);
  }
})();
