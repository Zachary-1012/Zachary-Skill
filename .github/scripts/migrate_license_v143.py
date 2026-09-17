from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
VERSION = "1.4.3"
LICENSE_REF = "LicenseRef-TrendHub-Free-Use-1.0"

LICENSE_TEXT = '''TrendHub Free Use License 1.0

Copyright (c) 2026 Zachary. All rights reserved except as expressly granted below.

This is a source-available license. It is not an open-source license.

1. Scope

This License applies to the portions of TrendHub authored and owned by the Licensor (the "Software"). Third-party software, vendored code, dependencies, data, trademarks, and other materials identified in NOTICE or in their own notices remain governed by their respective licenses and rights; this License does not restrict rights granted by those third parties.

2. Free Use Grant

Subject to compliance with this License, the Licensor grants you a non-exclusive, worldwide, royalty-free, non-transferable, non-sublicensable right to download, install, execute, and use unmodified copies of the Software for:

(a) personal use; and
(b) internal business use, including commercial internal operations.

You may make reasonable copies solely for installation, backup, disaster recovery, and internal deployment within the same legal entity and for its employees acting on that entity's behalf.

3. Outputs

Reports, analyses, briefs, content, and other outputs created through lawful use of the Software may be used, copied, shared, or commercialized by you, subject to any rights or terms applicable to third-party source data or content. "Outputs" do not include the Software itself or substantial portions of its source code.

4. Restrictions

Except where applicable law expressly requires otherwise, you may not:

(a) modify, patch, adapt, translate, alter, or create derivative works of the Software;
(b) distribute, publish, republish, mirror, sublicense, sell, rent, lease, transfer, or otherwise make the Software or copies of it available to any third party;
(c) bundle, embed, or include the Software in another product, software distribution, appliance, extension, plugin, or downloadable package for third parties;
(d) host, expose, or provide the Software itself as a service, API, MCP server, managed service, or other remotely accessible product for third parties; or
(e) remove or alter copyright, license, attribution, or proprietary notices.

Using documented environment variables, MCP client configuration, runtime settings, or deployment settings without changing the Software's source or packaged files is permitted and is not considered a modification under this License.

5. No Transfer or Trademark Grant

No rights are granted except those expressly stated in this License. No trademark, trade name, logo, or branding rights are granted except the limited right to make truthful nominative reference to TrendHub when describing lawful use of the Software.

6. Prior Versions and Prior Grants

TrendHub v1.4.2 and earlier were released under the license terms that applied to those releases. This License does not revoke or retroactively restrict rights that a recipient validly received under an earlier license for an earlier copy or version. TrendHub distributions released as v1.4.3 and later are offered under this License unless a later release expressly states otherwise. Code or materials that remain available under a third-party or earlier license continue to carry the rights granted by that license for the applicable copy or material.

7. Termination

Your rights under this License terminate automatically if you violate its terms. Upon termination, you must stop using and delete copies of the Software covered by this License, except copies that you are legally required to retain. Rights under independently applicable third-party licenses are unaffected.

8. Disclaimer of Warranty

THE SOFTWARE IS PROVIDED "AS IS" AND WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE LICENSOR IS NOT LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM OR RELATED TO THE SOFTWARE OR ITS USE.

9. Entire License

This License states the complete permission granted by the Licensor for the Software covered by it. Any broader right, including modification, redistribution, republication, sublicensing, resale, or third-party hosted access, requires separate written permission from the Licensor.
'''


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def load_json(path: str):
    return json.loads(read(path))


def save_json(path: str, obj) -> None:
    write(path, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise RuntimeError(f"expected text not found in {path}: {old[:100]!r}")
    write(path, text.replace(old, new, 1))


write("LICENSE", LICENSE_TEXT)

pkg = load_json("trendhub-mcp/package.json")
pkg["version"] = VERSION
pkg["license"] = "SEE LICENSE IN LICENSE"
save_json("trendhub-mcp/package.json", pkg)

manifest = load_json("trendhub-mcp/manifest.json")
manifest["version"] = VERSION
manifest["license"] = LICENSE_REF
save_json("trendhub-mcp/manifest.json", manifest)

plugin = load_json("plugin.json")
plugin["version"] = VERSION
plugin["license"] = LICENSE_REF
save_json("plugin.json", plugin)

server = load_json("server.json")
server["version"] = VERSION
save_json("server.json", server)

replace_once("trendhub-mcp/scripts/remote-gateway.mjs", 'const VERSION = "1.4.2";', 'const VERSION = "1.4.3";')
replace_once("trendhub-mcp/src/server.ts", 'export const SERVER_VERSION = "1.4.2";', 'export const SERVER_VERSION = "1.4.3";')
replace_once(
    "trendhub-mcp/scripts/test-distribution.mjs",
    'must(version === "1.4.2", `expected distribution patch 1.4.2, got ${version}`);',
    'must(version === "1.4.3", `expected distribution patch 1.4.3, got ${version}`);',
)

test_path = "trendhub-mcp/scripts/test-distribution.mjs"
test_text = read(test_path)
anchor = 'const skill = readFileSync(join(REPO, "skills", "trendhub", "SKILL.md"), "utf8");\n'
if anchor not in test_text:
    raise RuntimeError("distribution test license read anchor missing")
test_text = test_text.replace(anchor, anchor + 'const productLicense = readFileSync(join(REPO, "LICENSE"), "utf8");\n', 1)
anchor2 = 'must(plugin.version === version, "portable plugin version must match package.json");\n'
if anchor2 not in test_text:
    raise RuntimeError("distribution test license assertion anchor missing")
license_assertions = '''must(pkg.license === "SEE LICENSE IN LICENSE", "package.json must point to the repository LICENSE");
must(lock.packages?.[""]?.license === pkg.license, "package-lock root license must match package.json");
must(manifest.license === "LicenseRef-TrendHub-Free-Use-1.0", "manifest license boundary mismatch");
must(plugin.license === "LicenseRef-TrendHub-Free-Use-1.0", "plugin license boundary mismatch");
must(productLicense.includes("TrendHub Free Use License 1.0"), "root product license title missing");
must(productLicense.includes("you may not") && productLicense.includes("modify") && productLicense.includes("distribute"), "root product license restrictions missing");
'''
test_text = test_text.replace(anchor2, anchor2 + license_assertions, 1)
write(test_path, test_text)

old_gov = '''## License vs upstream permissions

Repository permissions and software licensing are different concepts. The upstream repository remains owner-controlled, while the software is currently distributed under the MIT License. MIT permits recipients to use, copy, modify, fork and redistribute copies subject to the license terms. Changing those legal rights would require an explicit license decision; repository write protection alone does not revoke MIT rights in copies or forks.
'''
new_gov = '''## License vs upstream permissions

Repository permissions and software licensing are different concepts. Starting with TrendHub v1.4.3, TrendHub-authored portions are distributed under the **TrendHub Free Use License 1.0** (`LicenseRef-TrendHub-Free-Use-1.0`). It permits free personal use and free internal company/business use of unmodified copies, while prohibiting modification, derivative works, redistribution, republication, sublicensing, resale, and third-party hosted access to the software itself. Reasonable internal copies for installation, backup, disaster recovery, and internal deployment are permitted. Third-party components remain under their own licenses.

TrendHub v1.4.2 and earlier remain governed by the license terms that applied when those versions were released. The v1.4.3 license boundary does not revoke prior MIT grants for earlier copies or code already received under MIT.
'''
replace_once("GOVERNANCE.md", old_gov, new_gov)

readme = read("README.md")
if '当前主技能 **TrendHub v1.4.2**' not in readme:
    raise RuntimeError("README current version anchor missing")
readme = readme.replace('当前主技能 **TrendHub v1.4.2**', '当前主技能 **TrendHub v1.4.3**', 1)
if '## TrendHub v1.4.2 能力' not in readme:
    raise RuntimeError("README capability heading missing")
readme = readme.replace('## TrendHub v1.4.2 能力', '## TrendHub v1.4.3 能力', 1)
public_line = '> 本仓库**公开分发**：拿到仓库链接即可 clone 安装，无需审批、注册、登录或中央服务器。原仓库的写权限仅属于 `@Zachary-1012` 与其明确邀请的 Collaborators；公开用户不会因为仓库可见而获得 upstream 写权限。治理规则见 [`GOVERNANCE.md`](./GOVERNANCE.md)。\n'
if public_line not in readme:
    raise RuntimeError("README public distribution anchor missing")
license_note = '''
> **许可边界（v1.4.3+）**：个人和公司/组织可免费使用未修改的 TrendHub，包括内部商业运营；允许安装、备份和内部部署所需的合理副本。**禁止修改、派生、再发布、再分发、转售、转授权或向第三方托管提供 TrendHub 软件本身。** 使用 TrendHub 产生的报告/分析/内容不受该软件分发限制，但仍须遵守第三方数据或内容权利。完整条款见 [`LICENSE`](./LICENSE)。v1.4.2 及更早版本保留其发布时已经授予的 MIT 权利，不能追溯收回。
'''
readme = readme.replace(public_line, public_line + license_note, 1)
old_mit = '软件当前仍按 **MIT License** 分发；MIT 在法律层面允许使用者对自己的副本进行 fork/修改/再分发，这与“不能修改原 upstream 仓库”是两个不同概念。若未来要改成“法律上仅允许使用、禁止修改/再分发”，需要单独做许可证变更。'
if old_mit not in readme:
    raise RuntimeError("README old MIT statement missing")
readme = readme.replace(old_mit, '软件从 **TrendHub v1.4.3** 起按 **TrendHub Free Use License 1.0** 分发：个人与公司可免费使用未修改版本，但不得修改、制作派生版本、再发布或再分发软件本身；第三方依赖/代码仍按各自许可证执行。v1.4.2 及以前已经授予的 MIT 权利不追溯撤销。', 1)
write("README.md", readme)

dist = read("DISTRIBUTION.md")
for old, new in [
    ('Stable tool contract: **TrendHub v1.4.2, 19 MCP tools, 38 public trend sources**', 'Stable tool contract: **TrendHub v1.4.3, 19 MCP tools, 38 public trend sources**'),
    ('v1.4.2 is `active`, `isLatest=true`, remote URL points to the production Streamable HTTP endpoint', 'the latest published release is `active`, `isLatest=true`, and the remote URL points to the production Streamable HTTP endpoint'),
    ('Portable Agent Plugin metadata and remote MCP configuration are version-locked to v1.4.2', 'Portable Agent Plugin metadata and remote MCP configuration are version-locked to the current Stable Release'),
]:
    if old not in dist:
        raise RuntimeError(f"DISTRIBUTION anchor missing: {old}")
    dist = dist.replace(old, new, 1)
marker = "## Direct-use paths\n"
if marker not in dist:
    raise RuntimeError("DISTRIBUTION insertion marker missing")
license_section = '''## License boundary

Starting with **TrendHub v1.4.3**, TrendHub-authored portions use the **TrendHub Free Use License 1.0** (`LicenseRef-TrendHub-Free-Use-1.0`): free personal use and free internal company/business use of unmodified copies are permitted; modification, derivative works, redistribution, republication, sublicensing, resale, and third-party hosted access to the software itself are prohibited. Third-party components remain under their own licenses. v1.4.2 and earlier retain the license rights granted when those releases were published.

Distribution directories must not describe TrendHub v1.4.3+ as MIT or as open-source software.

'''
dist = dist.replace(marker, license_section + marker, 1)
write("DISTRIBUTION.md", dist)

notice = read("trendhub-mcp/NOTICE")
old_notice = "TrendHub MCP is distributed under the MIT License (see LICENSE)."
if old_notice not in notice:
    raise RuntimeError("NOTICE MIT statement missing")
notice = notice.replace(old_notice, "TrendHub-authored portions of TrendHub MCP v1.4.3+ are distributed under the TrendHub Free Use License 1.0 (see repository root LICENSE). Third-party components listed below remain under their own licenses, including the MIT-licensed vendored code identified in this NOTICE.", 1)
notice = notice.replace("NO TrendRadar code is copied or integrated into this MIT project.", "NO TrendRadar code is copied or integrated into TrendHub-authored code.", 1)
write("trendhub-mcp/NOTICE", notice)

print("LICENSE SOURCE MIGRATION OK")
