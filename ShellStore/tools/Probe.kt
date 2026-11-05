import com.xbta.shellstore.core.*
import java.io.File

/**
 * SMD 源校验探针。
 * 用法: java -cp <out>:<stdlib> ProbeKt <file.md>
 * 退出码 0 = PASS，1 = FAIL。
 */
fun main(args: Array<String>) {
    val path = args.firstOrNull()
    if (path == null) {
        println("用法: Probe <file.md>")
        return
    }
    val f = File(path)
    if (!f.exists()) {
        println("FAIL 文件不存在: $path")
        kotlin.system.exitProcess(1)
    }

    val r = SmdParser.parse(f.readText(), "probe", "probe")
    val e = r.source.entries
    val cats = r.source.categories

    println("文件   $path")
    println("条目   ${e.size}")
    println("分类   ${cats.size}  ${cats.map { it.name }}")
    println("类型   " + e.groupingBy { it.type.id }.eachCount())
    println("告警   ${r.warnings.size}")

    var fail = 0
    fun bad(msg: String) { println("FAIL  $msg"); fail++ }
    fun warn(msg: String) { println("WARN  $msg") }

    if (e.isEmpty()) bad("一条都没解析出来，检查是不是 ## / ### 少了空格")

    val uniqueIds = e.map { it.id }.toSet().size
    if (uniqueIds != e.size) {
        bad("id 冲突：${e.size} 条只有 $uniqueIds 个唯一 id —— 同分类下有重复标题")
        val byId = e.groupBy { it.id }.filterValues { it.size > 1 }
        byId.values.take(5).forEach { g -> println("      重复: " + g.joinToString { "${it.categoryId}/${it.title}" }) }
    }

    if (r.warnings.isNotEmpty()) {
        r.warnings.take(10).forEach { println("      L${it.line}: ${it.message}") }
        bad("存在 ${r.warnings.size} 条解析告警，目标应为 0")
    }

    // 说明：缺命令体的条目会被解析器直接跳过（并产生告警），不会留在 entries 里，
    // 所以上面「告警为 0」的检查已经覆盖这两种情况，这里不再单独判断。

    // @adb 里引号必须成对
    val badQuote = e.filter { it.adb.count { c -> c == '\'' } % 2 != 0 }
    if (badQuote.isNotEmpty()) {
        bad("${badQuote.size} 条 @adb 单引号不配对")
        badQuote.take(5).forEach { println("      ${it.title}") }
    }

    // 命名规范（仅提示，不计失败）：单分类源（一个 App 一份 scheme）标题应以「分类名_」开头。
    // 多分类通用源（如官方源 10 个分类）用裸标题才合理，跳过检查。
    val catNames = e.map { it.categoryId }.filter { it.isNotBlank() }.toSet()
    if (catNames.size <= 1) {
        val noPrefix = e.filter { it.categoryId.isNotBlank() && !it.title.startsWith(it.categoryId + "_") }
        if (noPrefix.isNotEmpty()) {
            warn("${noPrefix.size}/${e.size} 条标题缺「分类名_」前缀（如 ${noPrefix.first().categoryId}_${noPrefix.first().title}）")
            noPrefix.take(3).forEach { println("      ${it.title}") }
        }
    }

    println()
    if (fail == 0) {
        println("PASS  条目 $uniqueIds 唯一 · 告警 0")
    } else {
        println("FAIL  共 $fail 项")
        kotlin.system.exitProcess(1)
    }
}
